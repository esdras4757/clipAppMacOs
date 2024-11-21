import * as Clipboard from 'expo-clipboard';


export const handleMessage = (message) => {
    try {
        console.log('Mensaje recibido:', message);
        if (typeof message === 'string') {
            console.log('Mensaje de texto:', message);
            Clipboard.setStringAsync(message);
            console.log('Texto copiado en el portapapeles:', message);
            return;
        } 
    } catch (error) {
        console.log('Error al parsear el mensaje:', error);
        return;
    }
}
