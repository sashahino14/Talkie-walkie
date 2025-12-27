const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Servir les fichiers du dossier 'public'
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('Un utilisateur est connecté');

    // 1. Rejoindre une fréquence
    socket.on('join-frequency', (freq) => {
        // Quitter les autres salles avant pour éviter les échos
        socket.rooms.forEach(room => {
            if (room !== socket.id) socket.leave(room);
        });
        
        socket.join(freq);
        console.log(`User ${socket.id} a rejoint la fréquence ${freq}`);
    });

    // 2. Recevoir la voix ET le pseudo
    socket.on('voice-data', (data) => {
        const { frequency, audioBlob, username } = data;
        
        // On renvoie un objet complet aux autres : le son + le nom de celui qui parle
        socket.to(frequency).emit('receive-voice', { 
            audioBlob: audioBlob, 
            username: username 
        });
    });
});

// Render nous donne un PORT, sinon on utilise 3000 en local
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Serveur écoute sur le port ${PORT}`);
});