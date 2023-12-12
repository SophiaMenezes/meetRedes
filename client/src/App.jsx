import React, { useRef, useState, useEffect } from "react";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import TextField from "@material-ui/core/TextField";
import AssignmentIcon from "@material-ui/icons/Assignment";
import PhoneIcon from "@material-ui/icons/Phone";
import "./App.css";
import { CopyToClipboard } from "react-copy-to-clipboard";
import io from "socket.io-client";
import Peer from "simple-peer";

// Conexão do socket
const socket = io.connect("http://localhost:8000");

function App() {
  // Definição dos estados
  const [me, setMe] = useState(""); // ID do usuário atual
  const [stream, setStream] = useState(); // Stream de mídia
  const [receivingCall, setReceivingCall] = useState(false); // Indica se está recebendo uma chamada
  const [caller, setCaller] = useState(""); // ID do chamador
  const [callerSignal, setCallerSignal] = useState(); // Dados de sinalização do chamador
  const [callAccepted, setCallAccepted] = useState(false); // Indica se a chamada foi aceita
  const [idToCall, setIdToCall] = useState(""); // ID do usuário a ser chamado
  const [callEnded, setCallEnded] = useState(false); // Indica se a chamada foi encerrada
  const [name, setName] = useState(""); // Nome do usuário
  const myVideo = useRef(); // Referência para o elemento de vídeo do usuário atual
  const userVideo = useRef(); // Referência para o elemento de vídeo do outro usuário
  const connectionRef = useRef(); // Referência para a conexão do Simple Peer

  useEffect(() => {
    // Solicitação de permissão de mídia
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (myVideo.current) {
          myVideo.current.srcObject = stream;
        }
      });

    // Evento 'me': Recebe o ID do usuário atual do servidor
    socket.on("me", (id) => {
      setMe(id);
    });

    // Evento 'callUser': Recebe a chamada de outro usuário
    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setName(data.name);
      setCallerSignal(data.signal);
    });
  }, []);

  const callUser = (id) => {
    // Inicia uma chamada para o usuário com o ID especificado
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    // Evento 'signal': Envia os dados de sinalização para o servidor
    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: me,
        name: name,
      });
    });

    // Evento 'stream': Recebe a stream de mídia do outro usuário
    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });

    // Evento 'callAccepted': Sinaliza que a chamada foi aceita e envia os dados de sinalização
    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer; // Armazena a conexão do Simple Peer
  };

  const answerCall = () => {
    // Responde a uma chamada recebida
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    // Evento 'signal': Envia os dados de sinalização para o servidor
    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: caller });
    });

    // Evento 'stream': Recebe a stream de mídia do outro usuário
    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });

    peer.signal(callerSignal); // Sinaliza a chamada com os dados de sinalização do chamador
    connectionRef.current = peer; // Armazena a conexão do Simple Peer
  };

  const leaveCall = () => {
    // Encerra a chamada
    setCallEnded(true);
    connectionRef.current.destroy();
  };

  useEffect(() => {
    // Evento 'receive_message': Recebe uma nova mensagem
    socket.on("receive_message", (data) => {
      setMessageList((current) => [...current, data]);
    });

    return () => socket.off("receive_message"); // Remove o ouvinte do evento ao desmontar o componente
  }, [socket]);

  return (
    <>
      <h1 style={{ textAlign: "center", color: "#fff" }}>Vídeo-Chamada</h1>
      <h2 style={{ textAlign: "center", color: "#fff" }}>
        Disciplina: Redes de Computadores
      </h2>
      <div className="container">
        <div className="video-container">
          <div className="video">
            {stream && (
              <video
                playsInline
                muted
                ref={myVideo}
                autoPlay
                style={{ width: "300px" }}
              />
            )}
          </div>
          <div className="video">
            {callAccepted && !callEnded ? (
              <video
                playsInline
                ref={userVideo}
                autoPlay
                style={{ width: "300px" }}
              />
            ) : null}
          </div>
        </div>
        <div className="myId">
          <TextField
            id="filled-basic"
            label="Seu Nome:"
            variant="filled"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginBottom: "20px" }}
          />
          <CopyToClipboard text={me} style={{ marginBottom: "2rem" }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AssignmentIcon fontSize="large" />}
            >
              Copiar
            </Button>
          </CopyToClipboard>

          <TextField
            id="filled-basic"
            label="ID para Ligação:"
            variant="filled"
            value={idToCall}
            onChange={(e) => setIdToCall(e.target.value)}
          />
          <div className="call-button">
            {callAccepted && !callEnded ? (
              <Button variant="contained" color="secondary" onClick={leaveCall}>
                Finalizar
              </Button>
            ) : (
              <IconButton
                color="secundary"
                aria-label="call"
                onClick={() => callUser(idToCall)}
              >
                <PhoneIcon fontSize="large" />
              </IconButton>
            )}
            {idToCall}
          </div>
        </div>
        <div>
          {receivingCall && !callAccepted ? (
            <div className="caller">
              <h1>{name} te convida para uma chamada de vídeo!</h1>
              <Button variant="contained" color="primary" onClick={answerCall}>
                Aceitar
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default App;
