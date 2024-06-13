import {IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonInput, IonButton, IonItem, IonLabel} from "@ionic/react";
import {useEffect, useRef, useState} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import ExploreContainer from "../components/ExploreContainer";
import "./Tab1.css";

const Tab1: React.FC = () => {
	const mapRef = useRef(null);
	const mapInstance = useRef<L.Map | null>(null);
	const [coordinates, setCoordinates] = useState({lat: 28.066446, lng: -82.417336});
	const [bleDevice, setBleDevice] = useState(null);
	const [writeCharacteristic, setWriteCharacteristic] = useState(null);
	const [status, setStatus] = useState("Disconnected");

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
		if (mapInstance.current) {
			const newLatLng = new L.LatLng(coordinates.lat, coordinates.lng);
			L.marker([newLatLng], {icon: my_icon}).addTo(mapInstance.current).bindPopup("New Location").openPopup();
			mapInstance.current.setView(newLatLng, 13);
		}
	};

	const handleIncomingData = (event: any) => {
        const value = new TextDecoder().decode(event.target.value);
        console.log("Received data:", value);
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
            notifyCharacteristic.addEventListener('characteristicvaluechanged', handleIncomingData);

			console.log("Connected");
			setStatus("Connected");
		} catch (error) {
			console.error("Connection failed!", error);
			setStatus(`Status: ${error}`);
		}
	};

	return (
		<IonPage>
			<IonHeader>
				<IonToolbar>
					<IonTitle>Tab 1</IonTitle>
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
			</IonContent>
		</IonPage>
	);
};

export default Tab1;
