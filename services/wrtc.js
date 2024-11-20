import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, RTCDataChannel } from 'react-native-webrtc';
import { connectToSignalingServer } from './signaling';
let dataChannel = null;
let remoteCandidates = [];

// Crear PeerConnection
const socket = connectToSignalingServer();

const pc = new RTCPeerConnection({
  iceServers: [
      {
          urls: "stun:stun.l.google.com:19302",
      },
      {
        urls: 'turn:relay1.expressturn.com:3478',
        username: 'ef0SAWSM9ABXU7KEYW',
        credential: 'y48ACpe0qLA0blxa'
     }
     ]
  });


pc.addEventListener( 'iceconnectionstatechange', event => {
  console.log('Estado de la conexión:', pc.connectionState);
	switch( pc.connectionState ) {
		case 'closed':
			// You can handle the call being disconnected here.

			break;
	};
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

pc.addEventListener( 'track', event => {
  console.log('Evento de pista:', event);
	// Grab the remote track from the connected participant.
	remoteMediaStream = remoteMediaStream || new MediaStream();
	remoteMediaStream.addTrack( event.track, remoteMediaStream );
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
const createOffer = async () => {
  try {
    const dataChannel = createDataChannel(); // Crear DataChannel

    // Crear promesas para la oferta y los candidatos ICE
    const offerPromise = createOfferPromise(pc);
    const iceCandidatesPromise = gatherIceCandidates(pc);

    // Esperar a que ambas promesas se resuelvan
    const [offer, iceCandidates] = await Promise.all([offerPromise, iceCandidatesPromise]);

    // Enviar la señalización con la oferta y los candidatos ICE
    sendSignal({
      type: 'offer',
      offer,
      iceCandidates,
    });

    console.log('Oferta y candidatos ICE enviados:', { offer, iceCandidates });
  } catch (error) {
    console.error('Error al crear y enviar la oferta:', error);
  }
};


// Manejar la oferta recibida
const handleOffer = async (message) => {
  try {
    const { offer, iceCandidates } = message;

    // Establecer descripción remota
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    console.log('Descripción remota establecida con éxito.');

    // Agregar los candidatos ICE remotos
    for (const candidate of iceCandidates) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    console.log('Candidatos ICE agregados correctamente.');

    // Crear y establecer la respuesta
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Enviar la respuesta al peer
    sendSignal({ type: 'answer', answer: pc.localDescription });
    console.log('Respuesta enviada correctamente:', pc.localDescription);

  } catch (error) {
    console.error('Error al manejar la oferta:', error);
  }
};



function gatherIceCandidates(peerConnection) {
  return new Promise((resolve) => {
    const candidates = [];
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        candidates.push(event.candidate);
      } else {
        // Null candidate: no hay más candidatos
        resolve(candidates);
      }
    };
  });
}

function createOfferPromise(peerConnection) {
  return new Promise(async (resolve, reject) => {
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      resolve(peerConnection.localDescription);
    } catch (error) {
      reject(error);
    }
  });
}


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
