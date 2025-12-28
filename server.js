const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Servir les fichiers du dossier 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Registre des utilisateurs : { socketId: { username, frequency } }
const connectedUsers = {};

io.on('connection', (socket) => {
    console.log('Nouvelle connexion:', socket.id);

    // 1. Rejoindre une fréquence (avec Pseudo)
    socket.on('join-frequency', (data) => {
        // data peut être juste une string (v1) ou un objet (v2)
        // On s'assure de récupérer les bonnes infos
        let frequency = "102.5";
        let username = "Inconnu";

        if (typeof data === 'object') {
            frequency = data.frequency;
            username = data.username;
        } else {
            frequency = data; // Compatibilité ancienne version
        }

        // Quitter l'ancienne salle si besoin
        if (connectedUsers[socket.id]) {
            socket.leave(connectedUsers[socket.id].frequency);
        }

        // Rejoindre la nouvelle
        socket.join(frequency);
        
        // Enregistrer l'utilisateur dans le registre
        connectedUsers[socket.id] = { username, frequency };

        console.log(`${username} a rejoint la fréquence ${frequency}`);

        // Mettre à jour le compteur pour tout le monde sur cette fréquence
        envoyerListeUtilisateurs(frequency);
    });

    // 2. Relayer la voix
    socket.on('voice-data', (data) => {
        const { frequency, audioBlob, username } = data;
        socket.to(frequency).emit('receive-voice', { 
            audioBlob: audioBlob, 
            username: username 
        });
    });

    // 3. Déconnexion
    socket.on('disconnect', () => {
        const user = connectedUsers[socket.id];
        if (user) {
            console.log(`${user.username} s'est déconnecté`);
            const freq = user.frequency;
            // Supprimer du registre
            delete connectedUsers[socket.id];
            // Prévenir les autres sur la même fréquence
            envoyerListeUtilisateurs(freq);
        }
    });
});

// Fonction pour compter et envoyer la liste des agents
function envoyerListeUtilisateurs(freq) {
    // Filtrer les utilisateurs qui sont sur cette fréquence
    const agents = Object.values(connectedUsers)
        .filter(u => u.frequency === freq)
        .map(u => u.username);

    // Envoyer la liste à tous ceux sur la fréquence
    io.to(freq).emit('update-user-list', agents);
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Serveur HI-LINK écoute sur le port ${PORT}`);
});