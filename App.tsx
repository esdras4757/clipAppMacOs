/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useRef} from 'react';
import type {PropsWithChildren} from 'react';
import {
  Button,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import {useEffect, useState} from 'react';
import * as Clipboard from 'expo-clipboard';
import Zeroconf from 'react-native-zeroconf';
import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';
import {NativeModules} from 'react-native';
import {connectToSignalingServer} from './services/signaling.js';
import UsegetLocalDevices from './Components/SearchLocalDevices.js';
import {sendText} from './services/wrtc.js';
type SectionProps = PropsWithChildren<{
  title: string;
}>;

interface ClipboardContent {
  content: any;
  type: string;
}

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [clipboardContent, setClipboardContent] = useState<ClipboardContent>({
    content: '',
    type: '',
  });

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  useEffect(() => {
    if (clipboardContent.content !== '') {
      if (clipboardContent.type === 'text ') {
        sendText(clipboardContent.content);
      }
    }
  }, [clipboardContent]);

  function base64ToArrayBuffer(base64: any) {
    const binaryString = atob(base64.split(',')[1]); // Eliminar el encabezado de la imagen data:image/png;base64,...
    const len = binaryString.length;
    const buffer = new ArrayBuffer(len);
    const view = new Uint8Array(buffer);

    for (let i = 0; i < len; i++) {
      view[i] = binaryString.charCodeAt(i);
    }

    return buffer;
  }

  function sendImage(sendText: any, base64Image: any) {
    // Comprobar si la imagen actual es igual a la anterior
    const chunks = [];
    let offset = 0;

    if (
      typeof base64Image !== 'string' ||
      !base64Image.startsWith('data:image/')
    ) {
      console.error('La imagen proporcionada no es válida.');
      return;
    }

    if (base64Image === clipboardContent.content) {
      return;
    }

    const imageData = base64Image.split(',')[1]; // Esto elimina el prefijo base64
    if (!imageData) {
      console.error('No se pudo extraer la imagen en formato base64.');
      return;
    }

    setClipboardContent({
      content: base64Image,
      type: 'image',
    });

    const arrayBuffer = base64ToArrayBuffer(base64Image);

    sendImageInChunks(sendText, arrayBuffer);

    // sendText(base64Image);
  }

  function sendImageInChunks(sendText: any, data: any, chunkSize = 16384) {
    const chunks = [];
    let offset = 0;

    while (offset < data.byteLength) {
      const chunk = data.slice(offset, offset + chunkSize);
      chunks.push(chunk);
      offset += chunkSize;
    }

    sendText(`IMAGE_CHUNKS:${chunks.length}`); // Enviar el número total de fragmentos

    chunks.forEach((chunk, index) => {
      const message = {
        chunk, // El fragmento de datos binarios
        index, // Índice del fragmento
        totalChunks: chunks.length, // Número total de fragmentos
      };

      // Solo enviamos el ArrayBuffer (chunk), los demás datos pueden ir en otro mensaje si es necesario
      sendText(chunk); // Enviar el fragmento real
      console.log('Enviado el fragmento', index);
      // También puedes enviar los metadatos en otro mensaje separado si lo prefieres
    });
  }

  useEffect(() => {
    const interval = setInterval(() => {
      // Leer contenido del portapapeles al iniciar la app
      const fetchClipboard = async () => {
        try {
          if (await Clipboard.hasImageAsync()) {
            const resImage = await Clipboard.getImageAsync({format: 'png'}); // Método correcto
            const base64Image = resImage?.data ?? '';
            sendImage(sendText, base64Image);
          } else if (await Clipboard.hasStringAsync()) {
            const content = await Clipboard.getStringAsync(); // Método correcto

            if (content !== clipboardContent.content) {
              console.log('actualizo texto');
              setClipboardContent({
                content,
                type: 'text',
              }); // Actualiza el estado solo si hay un cambio
            }
          }
        } catch (error) {
          console.error('Error al obtener el portapapeles:', error);
        }
      };

      fetchClipboard();
    }, 1000); // 1 segundo (puedes ajustar este valor)

    // Limpiar el intervalo cuando el componente se desmonte
    return () => clearInterval(interval);
  }, [clipboardContent]);
  // const handleCopyToClipboard = () => {
  //   Clipboard.setStringAsync(clipboardContent); // Método correcto
  // };

  return (
    <SafeAreaView style={backgroundStyle}>
      <View style={{padding: 20}}>
        {clipboardContent.type == 'text' ? (
          <Text>Contenido del Portapapeles: {clipboardContent.content}</Text>
        ) : (
          <Image
            style={{
              width: 200,
              height: 450,
              resizeMode: 'cover',
              margin: 'auto',
            }}
            source={{uri: clipboardContent.content.data}}
            alt="clipboard"
          />
        )}
        <TextInput style={{height: 50, backgroundColor: 'gray'}} />

        <UsegetLocalDevices />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});

export default App;
