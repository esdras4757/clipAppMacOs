import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, RTCDataChannel } from 'react-native-webrtc';
import { connectToSignalingServer } from './signaling';
import { handleMessage } from './handleMessage';
let dataChannel = null;
let remoteCandidates = [];

// Crear PeerConnection
const socket = connectToSignalingServer();

const pc = new RTCPeerConnection({
  iceServers: [
    {
      urls: "stun:stun.relay.metered.ca:80",
    },
      {
        urls: 'turn:global.relay.metered.ca:443',
        username: 'e61a2043de714c760278910e',
        credential: 'YB3D0kGKDPWfYjPV'
     }
     ]
  });

pc.ondatachannel = (event) => {
    console.log("DataChannel recibido desde el peer:", event.channel);
    dataChannel = event.channel;
  
    dataChannel.onopen = () => {
      console.log("DataChannel abierto y listo para enviar mensajes.");
    };
  
    dataChannel.onmessage = (event) => {
       handleMessage(event.data);      
    };
  };

pc.addEventListener( 'iceconnectionstatechange', event => {
  console.log('Estado de la conexión:', pc.connectionState);
	switch( pc.connectionState ) {
		case 'closed':
			// You can handle the call being disconnected here.

			break;
	};
} );

pc.addEventListener( 'onnegotiationneeded', event => {
  console.log('Negociación necesaria:', event);
  // You can start the offer stages here.
  // Be careful as this event can be called multiple times.
} );

pc.addEventListener( 'connectionstatechange', event => {
  console.log('Estado de la conexión:', pc.connectionState);
	switch( pc.connectionState ) {
		case 'closed':
			// You can handle the call being disconnected here.

			break;
	};
} );

pc.addEventListener( 'icecandidate', event => {
  console.log('Candidato ICE:', event.candidate);

  
	// When you find a null candidate then there are no more candidates.  
	// Gathering of candidates has finished.
	if ( !event.candidate ) { return; };

  sendSignal({ type: 'candidate', candidate: event.candidate });


	// Send the event.candidate onto the person you're calling.
	// Keeping to Trickle ICE Standards, you should send the candidates immediately.
} );

pc.addEventListener( 'icecandidateerror', event => {
  console.log('Error de candidato ICE:', event.errorCode);
	// You can ignore some candidate errors.
	// Connections can still be made even when errors occur.
} );

pc.addEventListener( 'negotiationneeded', event => {
  console.log('Negociación necesaria:', event);
	// You can start the offer stages here.
	// Be careful as this event can be called multiple times.
} );

pc.addEventListener( 'signalingstatechange', event => {
  console.log('Estado de señalización:', pc.signalingState);
	switch( pc.signalingState ) {
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
      handleMessage(event.data);
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

    // Verifica que la oferta tenga el formato esperado
    if (!offer || offer.type !== "offer" || !offer.sdp) {
      throw new Error("Formato de oferta inválido.");
    }

    // Establecer la descripción remota
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    console.log('Descripción remota establecida con éxito.');

    // Crear una respuesta a la oferta
    const answer = await pc.createAnswer();
    
    // Establecer la descripción local
    await pc.setLocalDescription(answer);
    console.log('Descripción local establecida:', pc.localDescription);

    // Procesar candidatos (asegúrate de definir este método)
    processCandidates();

    // Enviar la señal de respuesta
    sendSignal({ type: "answer", answer: pc.localDescription });
    console.log('Respuesta enviada correctamente:', pc.localDescription);

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
// pc.onicecandidate = (event) => {
//   if (event.candidate) {
//     pc.addIceCandidate(new RTCIceCandidate(event.candidate));
//     sendSignal({ type: 'candidate', candidate: event.candidate });
//     console.log('Candidato ICE enviado:', event.candidate);
//   }
// };

function handleRemoteCandidate( iceCandidate ) {

	if ( pc.remoteDescription == null ) {
		return remoteCandidates.push( iceCandidate );
	};

	return pc.addIceCandidate( iceCandidate );
};


function processCandidates() {
	if ( remoteCandidates.length < 1 ) { return; };
	remoteCandidates.map( candidate => pc.addIceCandidate( candidate ) );
	remoteCandidates = [];
};

// Manejar candidato ICE recibido
const handleCandidate = (candidate) => {
  console.log('Candidato ICE recibido:', candidate);
  pc.addIceCandidate(candidate);
};

// Función para enviar la señalización
const sendSignal = (message) => {
  if (socket.readyState === WebSocket.OPEN) {
    console.log('Enviando mensaje:', message);
    socket.send(JSON.stringify(message));
  }
};

// Exportar funciones
export { createOffer, handleOffer, handleAnswer, handleRemoteCandidate, sendText };
