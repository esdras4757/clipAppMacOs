import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, RTCDataChannel } from 'react-native-webrtc';
import { connectToSignalingServer } from './signaling';
let dataChannel = null;

// Crear PeerConnection
const socket = connectToSignalingServer();

const pc = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
});

pc.addEventListener( 'iceconnectionstatechange', event => {
  console.log('Estado de la conexión:', pc.connectionState);
	switch( pc.connectionState ) {
		case 'closed':
			// You can handle the call being disconnected here.

			break;
	};
} );




const createDataChannel = () => {
  if (!dataChannel) {
    dataChannel = pc.createDataChannel('chat',{
      ordered: true,
      reliable: true,
    });

    dataChannel.binaryType = 'arraybuffer';

    dataChannel.onopen = () => {
      console.log("DataChannel abierto y listo para enviar mensajes.");
    };

    dataChannel.onmessage = (event) => {
      console.log("Mensaje recibido en DataChannel:", event.data);
    };
  }
  return dataChannel;
};

const sendText = (text) => {
  if (dataChannel?.readyState === 'open') {
    try {
      console.log('Enviando mensaje:', text);
      dataChannel.send(text);
      return true;
    } catch (error) {
      console.log('Error al enviar el mensaje:', error);
    }
  } else {
    console.log('No se pudo enviar el mensaje:', text);
    console.log('Estado de dataChannel:', dataChannel?.readyState);
  }
  return false;
};

// Crear una oferta sin audio ni video (solo datos)
const createOffer = () => {
  const dataChannel = createDataChannel(); // Crear DataChannel

  // Crear una oferta sin audio ni video
  pc.createOffer()
    .then((offer) => pc.setLocalDescription(offer))
    .then(() => {
      sendSignal({ type: 'offer', offer: pc.localDescription });
    });
};

// Manejar la oferta recibida
const handleOffer = async (offer) => {
  try {
    console.log('Oferta (offer) recibida:', offer);
    console.log(offer.type)
    // Establecer la descripción remota
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    
    // Crear una respuesta a la oferta
    const answer = await pc.createAnswer();
    
    // Establecer la descripción local
    await pc.setLocalDescription(answer);
    
    // Enviar la señal de respuesta
    sendSignal({ type: "answer", "answer": pc.localDescription });

    console.log('Oferta (offer) establecida correctamente.');
    console.log('Respuesta (answer) enviada:', pc.localDescription);
  } catch (error) {
    console.error('Error al manejar la oferta (offer):', error);
  }
};


// Manejar la respuesta recibida
const handleAnswer = async (answer) => {
  try {
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    console.log("Respuesta (answer) establecida correctamente.");

    // Ahora puedes empezar a usar el DataChannel para enviar y recibir texto.
  } catch (error) {
    console.log('Error al manejar la respuesta (answer):', error);
  }
};

// Enviar un candidato ICE al peer
pc.onicecandidate = (event) => {
  if (event.candidate) {
    pc.addIceCandidate(new RTCIceCandidate(event.candidate));
    sendSignal({ type: 'candidate', candidate: event.candidate });
    console.log('Candidato ICE enviado:', event.candidate);
  }
};

// Manejar candidato ICE recibido
const handleCandidate = (candidate) => {
  console.log('Candidato ICE recibido:', candidate);
  pc.addIceCandidate(new RTCIceCandidate(candidate));
};

// Función para enviar la señalización
const sendSignal = (message) => {
  if (socket.readyState === WebSocket.OPEN) {
    console.log('Enviando mensaje:', message);
    socket.send(JSON.stringify(message));
  }
};

// Exportar funciones
export { createOffer, handleOffer, handleAnswer, handleCandidate, sendText };
