import {IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonInput, IonButton, IonItem, IonLabel, IonToggle, IonList} from "@ionic/react";
import {useEffect, useRef, useState} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import ExploreContainer from "../components/ExploreContainer";
import "./Tab1.css";

interface LoraLog{
	gps_string: string;
	time: string;
}

const Tab1: React.FC = () => {
	const mapRef = useRef(null);
	const mapInstance = useRef<L.Map | null>(null);
	const [coordinates, setCoordinates] = useState({lat: 28.066446, lng: -82.417336});
	const [bleDevice, setBleDevice] = useState(null);
	const [writeCharacteristic, setWriteCharacteristic] = useState(null);
	const [status, setStatus] = useState("Disconnected");
	const [displayOnUpdate, setDisplayOnUpdate] = useState(true);
	const [loraHistory, setLoraHistory] = useState<LoraLog[]>([]);

	useEffect(() => {
		if (mapRef.current && !mapInstance.current) {
			mapInstance.current = L.map(mapRef.current).setView([coordinates.lat, coordinates.lng], 13);
			L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
				attribution: "© OpenStreetMap contributors",
			}).addTo(mapInstance.current);
			setTimeout(() => {
				mapInstance.current.invalidateSize();
				mapInstance.current.setView([coordinates.lat, coordinates.lng], 13);
			}, 500);
		}
		return () => {
			if (mapInstance.current) {
				mapInstance.current.remove();
				mapInstance.current = null;
			}
		};
	}, []);

	const handleCoordinateChange = (event) => {
		setCoordinates({...coordinates, [event.target.name]: parseFloat(event.target.value)});
	};

	const handleCache = () => {
		console.log("Cache tiles around:", coordinates);
	};

	let my_icon = L.Icon.extend({
		shadowURL: "",
		iconSize: [],
		shadowSize: [],
		iconAnchor: [],
		shadowAnchor: [],
		popupAnchor: [],
	});

	
  const handleDisplay = () => {
    if (mapInstance.current && displayOnUpdate) {
      const newLatLng = new L.LatLng(coordinates.lat, coordinates.lng);
      L.marker(newLatLng).addTo(mapInstance.current)
        .bindPopup('New Location')
        .openPopup();
      mapInstance.current.setView(newLatLng, 13);
    }
  };


	const handleIncomingData = (event: any) => {
		const value = new TextDecoder().decode(event.target.value);
		console.log("Received data:", value);
		// Value can be either ping or GPS data
		var newHistory = loraHistory;
		var newLog:LoraLog = {
			time: new Date().toUTCString(),
			gps_string: value
		}
		newHistory.push(newLog);
		setLoraHistory(newHistory);
		// 1. Determine if value is gps data or not
		// if starts with "GS" then its GPS
		if (value.slice(0, 2) == "GS") {
			console.log(value);
			// 2. If it is GPS, then extract latitude and longitude
			// Sift and slice string by the commas
			// GS,2805.5864,N,08210.5440,W
			// let value = "GS,2805.5864,N,08210.5440,W"
			let lat_deg = parseFloat(value.slice(3, 5));
			let lat_min = parseFloat(value.slice(5, 12));
			let lat_dir = value.slice(13, 14);
			let long_deg = parseFloat(value.slice(15, 18));
			let long_min = parseFloat(value.slice(18, 25));
			let long_dir = value.slice(26, 27);
			// console.log(`GPS in DDMM.MMMM, DDDMM.MMMM: \nLatitude: \n${lat_deg}\n${lat_min}\n${lat_dir}\n\nLongitude: \n${long_deg}\n${long_min}\n${long_dir}`);

			lat_min = lat_min / 60; 
			lat_deg = lat_deg + lat_min;
            if (lat_dir == "N") {
                lat_min = lat_min * 1;
            };
            if (lat_dir == "S") {
                lat_min = lat_min * -1;
            };

            long_min = long_min / 60;
            long_deg = long_deg + long_min;
            if (long_dir == "E") {
                long_deg = long_deg * 1;
            };
            if (long_dir == "W") {
                long_deg = long_deg * -1;

            };

			console.log(`GPS in DD.DDDD, DD.DDDD: \nLatitude:   ${lat_deg}\nLongitude: ${long_deg}`);

			// 3. Display lat/long on map
			// Stuff that I (Pavan) is working on as of 9:21 PM EDT June 14 2024
			// coordinates.lat = lat_deg;
			// handleCoordinateChange
			// coordinates.lng = long_deg;
			if(isNaN(lat_deg) || isNaN(long_deg)){
				setStatus("NOT A FIX");
			}
			else if (mapInstance.current && displayOnUpdate) {
				setCoordinates({lat: lat_deg, lng:long_deg});
				const newLatLng = new L.LatLng(lat_deg, long_deg);
				L.marker(newLatLng).addTo(mapInstance.current)
				  .bindPopup('New Location')
				  .openPopup();
				if(displayOnUpdate == true) {
					mapInstance.current.setView(newLatLng, 13);
				};
			  }
			
		}

		
	};

	const connectToDevice = async () => {
		try {
			console.log("Requesting Bluetooth Device...");
			const device = await navigator.bluetooth.requestDevice({
				filters: [{name: "SOAR_L1 Tracker"}],
				optionalServices: ["6e400001-b5a3-f393-e0a9-e50e24dcca9e"],
			});

			console.log("Connecting to GATT Server...");
			const server = await device.gatt.connect();
			const serviceUuid = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
			const notifyCharacteristicUuid = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
			const characteristicUuid = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

			console.log("Getting Service...");
			const service = await server.getPrimaryService(serviceUuid);
			console.log("Getting Characteristic...");
			const characteristic = await service.getCharacteristic(characteristicUuid);
			setWriteCharacteristic(characteristic);
			setBleDevice(device);

			const notifyCharacteristic = await service.getCharacteristic(notifyCharacteristicUuid);
			notifyCharacteristic.startNotifications();
			notifyCharacteristic.addEventListener("characteristicvaluechanged", handleIncomingData);

			console.log("Connected");
			setStatus("Connected");
		} catch (error) {
			console.error("Connection failed!", error);
			setStatus(`Status: ${error}`);
		}
	};

	useEffect(()=>{
		console.log(displayOnUpdate);
	}, [displayOnUpdate])

	return (
		<IonPage>
			<IonHeader>
				<IonToolbar>
					<IonTitle>Locate GPS</IonTitle>
				</IonToolbar>
			</IonHeader>
			<IonContent fullscreen>
				<IonHeader collapse="condense">
					<IonToolbar>
						<IonTitle size="large">Tab 1</IonTitle>
					</IonToolbar>
				</IonHeader>
				<IonButton expand="block" onClick={connectToDevice}>
					Connect To LORA Receiver
				</IonButton>

				<IonToggle checked={displayOnUpdate} onIonChange={(e) => {
					setDisplayOnUpdate(e.detail.checked)
				}}>Display On Update</IonToggle>


				<ExploreContainer name="Tab 1 page" />
				<div id="mapid" style={{height: "500px"}} ref={mapRef}></div>
				<IonItem>
					<IonLabel position="floating">Latitude</IonLabel>
					<IonInput type="number" value={coordinates.lat} onIonChange={handleCoordinateChange} name="lat"></IonInput>
				</IonItem>
				<IonItem>
					<IonLabel position="floating">Longitude</IonLabel>
					<IonInput type="number" value={coordinates.lng} onIonChange={handleCoordinateChange} name="lng"></IonInput>
				</IonItem>
				<IonButton expand="block" onClick={handleCache}>
					Cache
				</IonButton>
				<IonButton expand="block" onClick={handleDisplay}>
					Display
				</IonButton>
				<p>{status}</p>
				<IonList>
					{loraHistory.map((v, i)=>{
						return <IonItem>
							{v.time} : {v.gps_string}
						</IonItem>
					})}
				</IonList>
			</IonContent>
		</IonPage>
	);
};

export default Tab1;
