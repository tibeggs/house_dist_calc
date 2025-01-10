// services/mapService.js
export class MapService {
    constructor() {
      this.map = null;
      this.geocoder = null;
      this.directionsService = null;
      this.directionsRenderers = [];
      this.markers = [];
      this.autocompletes = [];
      this.isLoaded = false;
    }
  
    get isGoogleMapsLoaded() {
      return this.isLoaded;
    }
  
    async loadGoogleMapsScript(apiKey) {
      if (this.isLoaded) return Promise.resolve();
      
      return new Promise((resolve, reject) => {
        // Create a callback function that will be called when Google Maps is loaded
        const callbackName = 'googleMapsCallback_' + Math.random().toString(36).substr(2, 9);
        window[callbackName] = () => {
          this.isLoaded = true;
          delete window[callbackName];
          resolve();
        };
  
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&loading=async&callback=${callbackName}`;
        script.async = true;
        script.onerror = () => {
          delete window[callbackName];
          reject(new Error('Failed to load Google Maps script'));
        };
        document.head.appendChild(script);
      });
    }
  
    initializeMap(mapElement) {
      this.map = new google.maps.Map(mapElement, {
        center: { lat: 37.7749, lng: -122.4194 },
        zoom: 12
      });
      this.geocoder = new google.maps.Geocoder();
      this.directionsService = new google.maps.DirectionsService();
    }
  
    initializeAutocomplete(input) {
      const autocomplete = new google.maps.places.Autocomplete(input);
      this.autocompletes.push(autocomplete);
      return autocomplete;
    }
  
    clearMap() {
      this.directionsRenderers.forEach(renderer => renderer.setMap(null));
      this.directionsRenderers = [];
      this.markers.forEach(marker => marker.setMap(null));
      this.markers = [];
    }
  
    async calculateRoute(origin, destination, index=0) {
      return new Promise((resolve, reject) => {
        const directionsRenderer = new google.maps.DirectionsRenderer({
          map: this.map,
          preserveViewport: true,
          suppressMarkers: true,
          polylineOptions: this.getRouteOptions(index)
        });
        this.directionsRenderers.push(directionsRenderer);
  
        this.directionsService.route({
          origin,
          destination,
          travelMode: 'DRIVING'
        }, (result, status) => {
          if (status === 'OK') {
            directionsRenderer.setDirections(result);
            resolve(result);
          } else {
            reject(status);
          }
        });
      });
    }
  
    getRouteOptions(index = 0) {
      const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFA500', '#800080', '#008080', '#FFD700', '#FF69B4'];
      return {
        strokeColor: colors[index % colors.length],
        strokeOpacity: 0.7,
        strokeWeight: 4
      };
    }
  
    async addMarker(address, options = {}) {
      try {
        const result = await this.geocoder.geocode({ address });
        if (result.results[0]) {
          const marker = new google.maps.Marker({
            map: this.map,
            position: result.results[0].geometry.location,
            ...options
          });
          this.markers.push(marker);
          return marker;
        }
      } catch (error) {
        console.error('Error adding marker:', error);
        return null;
      }
    }
  
    fitMapToMarkers() {
      if (this.markers.length === 0) return;
      
      const bounds = new google.maps.LatLngBounds();
      this.markers.forEach(marker => bounds.extend(marker.getPosition()));
      this.map.fitBounds(bounds);
    }
  }