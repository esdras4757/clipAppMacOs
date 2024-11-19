import { handleAnswer, handleOffer, handleRemoteCandidate } from "./wrtc";

let socket;

const connectToSignalingServer = () => {
  // Conectarse al servidor WebSocket
  socket = new WebSocket('ws://192.168.1.84:8080');  // Cambia la URL si es necesario

  socket.onopen = () => {
    console.log('Conectado al servidor de señalización');
  };

  socket.onmessage = async(message) => {
    //     // Si no es una cadena, entonces se debe manejar como Buffer u otro tipo de datos
        const recivedMessage = message.data;  
        const recivedMessageString = JSON.parse(recivedMessage)
    //   
    
    //   // Manejar los diferentes tipos de mensajes
      if (recivedMessageString.type === 'offer') {
        console.log('OOOOFEFFFFFEEEEEERRRRRR')
        // console.log('Recibida oferta:', recivedMessageString.offer);
        await handleOffer(recivedMessageString.offer);
      } else if (recivedMessageString.type === 'answer') {
        console.log('Recibida respuesta:', recivedMessageString.answer);
        handleAnswer(recivedMessageString.answer);
      } else if (recivedMessageString.type === 'candidate') {
        console.log('Recibido candidato:', recivedMessageString.candidate);
        handleRemoteCandidate(recivedMessageString.candidate);
      }
    // } catch (error) {
    //   console.log('Error al parsear el mensaje:', error);
    //   return;
    // }
};

  socket.onerror = (error) => {
    console.log('Error en la conexión WebSocket:', error);
  };

  socket.onclose = () => {
    console.log('Desconectado del servidor de señalización');
  };

  return socket;
};

const sendSignal = (message) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
};

export { connectToSignalingServer, sendSignal };
