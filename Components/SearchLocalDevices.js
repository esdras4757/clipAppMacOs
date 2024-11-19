

import React, { useRef } from 'react';
import { useEffect, useState } from "react";
import { Button, Pressable, StyleSheet, Text, View } from 'react-native';
import Zeroconf from 'react-native-zeroconf'
import { createOffer } from '../services/wrtc';
import DeviceInfo from 'react-native-device-info';
let servicepubliched= false
const zeroconf = new Zeroconf();


const UsegetLocalDevices = () => {
  const timeoutRef = useRef(null);
  const [services, setServices] = useState([])
  const [reload, setReload] = useState(false)
  const [isScaning, setIsScaning] = useState(false)

  const reloadScan = () => {
    setServices([]);
    startDockScan();
  }

    const startDockScan = async () => {
        if (isScaning) {
          console.log('Ya está escaneando');
          return;
        }
    
        setIsScaning(true);
        zeroconf.scan('http');
    
        // Establece el timeout para detener el escaneo después de 10 segundos
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          zeroconf.stop();
        }, 10000);
      };

      const deviceName = async () => {
        try {
          const name = await DeviceInfo.getDeviceName();
          return name;
        } catch (error) {
          console.error('Error obteniendo el nombre del dispositivo: ', error);
        }
      };

    async function publishService () {
      if(servicepubliched){
        return
      }
      const name= await deviceName();
        zeroconf.publishService('http', 'tcp', 'local', name, 80);
        servicepubliched=true
      }

  


    useEffect(() => {
    
        // Inicia el escaneo
        // startDockScan();

        publishService();
    
        // Eventos de zeroconf
        zeroconf.on('start', () => {
          setServices([]);
          console.log('The scan has started.');
        });
    
        zeroconf.on('stop', () => {
          console.log('The scan has stopped.');
          setIsScaning(false);
        });
    
        zeroconf.on('found', (data) => {
          console.log('Service found', data);
        });
    
        zeroconf.on('resolved', (data) => {
          console.log('Service resolved', data);
          setServices((prevServices) => [...prevServices, data]);

        });
    
        zeroconf.on('error', (error) => {
          console.log('Error occurred:', error);
        });
    
        // Limpieza de eventos al desmontar el componente
        return () => {
          zeroconf.removeAllListeners('start');
          zeroconf.removeAllListeners('stop');
          zeroconf.removeAllListeners('found');
          zeroconf.removeAllListeners('resolved');
          zeroconf.removeAllListeners('error');
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
        };
      }, []);
// useEffect(() => {
//   console.log('services:', services);
//   if (services.length > 0) {
//     services.forEach((service) => {
//       zeroconf.unpublishService(service.name);
//     }
//     );
//   }
// }, [services]);

  return (
    <View style={{marginTop:50}}>
      {isScaning ? <Text>Escaneando...</Text> : 
        <Button  title="Buscar dispositivos" onPress={()=>createOffer()} />
        }
        {!isScaning&&
          services.map((service) => (
            <Pressable onPress={()=>createOffer(service)} style={styles.container} key={service.name} >
              <Text style={{flex:1}}>{service.name}</Text>
              <Text style={{flex:1}}>{service.type}</Text>
              <Text style={{flex:1}}>{service.host}</Text>
              <Text style={{flex:1}}>{service.address}</Text>
              <Text style={{flex:1}}>{service.port}</Text>
            </Pressable>
          ))
        }
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'red',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
})

export default UsegetLocalDevices