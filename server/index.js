const app = require('express')(); // Importa o módulo express e cria a instância do app
const server = require('http').createServer(app); // Cria o servidor HTTP usando o app
const io = require('socket.io')(server, { cors: { origin: 'http://localhost:5173', methods: [ "GET", "POST" ] } }); // Cria a instância do Socket.IO e define as configurações de CORS
const PORT = 8000; // Porta do servidor

// socket.io - biblioteca que permite a comunicação entre cliente e servidor
io.on("connection", socket => {
  socket.emit("me", socket.id); // Envia o ID do socket para o cliente
  console.log('Usuário conectado!', socket.id); // registrando no console que um usuário se conectou

  socket.on('disconnect', reason => {
    console.log('Usuário desconectado!', socket.id); // registrando no console que um usuário se desconectou
  });

  socket.on("disconnect", () => {                  // Quando um usuário se desconecta
    socket.broadcast.emit("Chamada Finalizada!"); // Emite um evento para todos os clientes informando que a chamada foi encerrada
  });

  socket.on("callUser", (data) => { // Evento iniciando a chamada
    io.to(data.userToCall).emit("callUser", { signal: data.signalData, from: data.from, name: data.name }); // Emite um evento para o cliente específico informando que está sendo chamado
  });

  socket.on("answerCall", (data) => {    // "responder" a chamada/atender
    io.to(data.to).emit("callAccepted", data.signal); // Emite um evento para o cliente específico informando que a chamada foi aceita
  });
});

server.listen(PORT, () => console.log('Executando o servidor...')); // Inicia o servidor na porta especificada e imprime uma mensagem no console
