import React, { useRef } from 'react';
import { WebView } from 'react-native-webview';
import { View, ActivityIndicator, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

type Location = { lat: number; lng: number };

type WebViewMapPickerProps = {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  selectedLocation?: Location | null;
};

const WEBVIEW_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { height: 100vh; width: 100vw; }
    .controls {
      position: absolute;
      bottom: 20px;
      right: 20px;
      z-index: 1000;
      background: white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      cursor: pointer;
    }
    .locate-btn {
      background: white;
      border: none;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    .info-tip {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-family: sans-serif;
      z-index: 1000;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="info-tip">Drag the pin to your exact location</div>
  <div class="controls">
    <button class="locate-btn" id="locateBtn">📍</button>
  </div>
  <script>
    // Initialize map with OpenStreetMap tiles (no API key needed)
    var map = L.map('map').setView([22.7533, 88.2255], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    var marker;
    var currentLocation = null;

    function sendLocation(lat, lng) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ lat, lng }));
      }
    }

    function setMarker(lat, lng) {
      if (marker) marker.remove();
      marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on('dragend', function(e) {
        var pos = e.target.getLatLng();
        setMarker(pos.lat, pos.lng);
        sendLocation(pos.lat, pos.lng);
      });
      map.setView([lat, lng], 16);
    }

    // Get user's current location (exact GPS)
    function locateUser() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          function(position) {
            var lat = position.coords.latitude;
            var lng = position.coords.longitude;
            setMarker(lat, lng);
            sendLocation(lat, lng);
          },
          function(error) {
            console.log("Geolocation error: " + error.message);
            // Fallback to Janai (default)
            setMarker(22.7533, 88.2255);
            sendLocation(22.7533, 88.2255);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        setMarker(22.7533, 88.2255);
        sendLocation(22.7533, 88.2255);
      }
    }

    // Listen for click on map to place pin
    map.on('click', function(e) {
      var lat = e.latlng.lat;
      var lng = e.latlng.lng;
      setMarker(lat, lng);
      sendLocation(lat, lng);
    });

    document.getElementById('locateBtn').addEventListener('click', function() {
      locateUser();
    });

    // Auto locate on load
    locateUser();
  </script>
</body>
</html>
`;

const WebViewMapPicker: React.FC<WebViewMapPickerProps> = ({
  onLocationSelect,
  selectedLocation,
}) => {
  const webviewRef = useRef<WebView>(null);

  const handleMessage = (event: any) => {
    try {
      const { lat, lng } = JSON.parse(event.nativeEvent.data);
      // Now fetch reverse geocoding and distance using your API
      onLocationSelect(lat, lng, '');
    } catch (e) {}
  };

  return (
    <View style={{ width: '100%', height: 250, borderRadius: 16, overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
      <WebView
        ref={webviewRef}
        source={{ html: WEBVIEW_HTML }}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => <ActivityIndicator size="large" color="#e11d48" style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -20 }} />}
      />
    </View>
  );
};

export default WebViewMapPicker;