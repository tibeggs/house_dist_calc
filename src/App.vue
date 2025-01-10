<!-- App.vue -->
<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Distance Calculator</h1>
    
    <!-- Home Address Input with Autocomplete -->
    <div class="mb-4">
      <label class="block mb-2">Home Address:</label>
      <input 
        ref="homeAddressInput"
        class="w-full p-2 border rounded text-black"
        placeholder="Enter your home address"
      />
    </div>

    <!-- Points of Interest -->
    <div class="mb-4">
      <h2 class="text-xl font-semibold mb-2">Points of Interest</h2>
      <PointOfInterest
        v-for="(poi, index) in pointsOfInterest"
        :key="index"
        :poi="poi"
        :mapService="mapService"
        @update:poi="updatePOI(index, $event)"
        @remove="removePOI(index)"
        @address-changed="handleAddressChange"
      />
      
      <div class="flex gap-2 mt-2">
        <button 
          @click="addPOI"
          class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Location
        </button>
        <button 
          @click="calculateRoutes"
          class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Calculate Routes
        </button>
      </div>
    </div>

    <!-- Map Component -->
    <div class="h-96 w-full border rounded">
      <div ref="mapRef" class="h-full w-full"></div>
    </div>
  </div>
</template>

<script>
import { MapService } from './services/mapService';
import PointOfInterest from './components/PointOfInterest.vue';

export default {
  name: 'App',
  components: {
    PointOfInterest
  },
  data() {
    return {
      homeAddress: '',
      pointsOfInterest: [
        { name: 'Work', address: '', distance: null, duration: null },
        { name: 'Costco', address: '', distance: null, duration: null },
        { name: 'Grocery Store', address: '', distance: null, duration: null },
        { name: 'Hardware Store', address: '', distance: null, duration: null }
      ],
      mapService: new MapService()
    }
  },
  async mounted() {
    try {
      await this.initializeMap();
    } catch (error) {
      console.error('Failed to initialize map:', error);
      alert('Failed to load Google Maps. Please check your internet connection and API key.');
    }
  },
  methods: {
    async initializeMap() {
      try {
        await this.mapService.loadGoogleMapsScript(import.meta.env.VITE_VUE_APP_GOOGLE_MAPS_API_KEY);
        this.mapService.initializeMap(this.$refs.mapRef);
        this.initializeHomeAutocomplete();
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    },
    initializeHomeAutocomplete() {
      const autocomplete = this.mapService.initializeAutocomplete(this.$refs.homeAddressInput);
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        this.homeAddress = place.formatted_address;
        this.handleAddressChange();
      });
    },
    updatePOI(index, updatedPoi) {
      this.pointsOfInterest[index] = updatedPoi;
    },
    addPOI() {
      this.pointsOfInterest.push({
        name: '',
        address: '',
        distance: null,
        duration: null
      });
    },
    removePOI(index) {
      this.pointsOfInterest.splice(index, 1);
      this.handleAddressChange();
    },
    handleAddressChange() {
      this.mapService.clearMap();
      this.pointsOfInterest.forEach(poi => {
        poi.distance = null;
        poi.duration = null;
      });
    },
    async calculateRoutes() {
      if (!this.homeAddress) {
        alert('Please enter a home address');
        return;
      }

      const validPOIs = this.pointsOfInterest.filter(poi => poi.address);
      if (validPOIs.length === 0) {
        alert('Please enter at least one destination address');
        return;
      }

      this.mapService.clearMap();

      // Calculate routes and update markers
      await this.updateRoutes();
      await this.updateMarkers();
    },
    async updateRoutes() {
      for (const [index, poi] of this.pointsOfInterest.entries()) {
        if (!poi.address) continue;

        try {
          const result = await this.mapService.calculateRoute(
            this.homeAddress,
            poi.address,
            index
          );
          
          const route = result.routes[0];
          const leg = route.legs[0];
          poi.distance = leg.distance.text;
          poi.duration = leg.duration.text;
        } catch (error) {
          console.error('Error calculating route:', error);
          poi.distance = 'Cannot calculate';
          poi.duration = 'Cannot calculate';
        }
      }
    },
    async updateMarkers() {
      // Add home marker
      await this.mapService.addMarker(this.homeAddress, {
        icon: { url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' },
        title: 'Home',
        zIndex: google.maps.Marker.MAX_ZINDEX + 1
      });

      // Add POI markers
      for (const [index, poi] of this.pointsOfInterest.entries()) {
        if (poi.address) {
          await this.mapService.addMarker(poi.address, {
            title: poi.name || 'POI',
            label: {
              text: (index + 1).toString(),
              color: 'white'
            }
          });
        }
      }

      this.mapService.fitMapToMarkers();
    }
  }
}
</script>