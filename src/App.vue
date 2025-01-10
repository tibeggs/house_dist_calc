// App.vue
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
        @place_changed="clearMap"
      />
    </div>

    <!-- Points of Interest -->
    <div class="mb-4">
      <h2 class="text-xl font-semibold mb-2">Points of Interest</h2>
      <div v-for="(poi, index) in pointsOfInterest" :key="index" class="mb-4 p-3 border rounded text-black">
        <div class="flex gap-2 mb-2">
          <input 
            v-model="poi.name"
            class="w-1/4 p-2 border rounded"
            placeholder="Location name"
          />
          <input 
            :ref="'poiAddress_' + index"
            class="w-2/3 p-2 border rounded"
            placeholder="Address"
            @place_changed="clearMap"
          />
          <button 
            @click="removePOI(index)"
            class="bg-red-500 text-white px-4 rounded hover:bg-red-600"
          >
            X
          </button>
        </div>
        <div v-if="poi.distance" class="text-white">
          <div>Distance: {{ poi.distance }}</div>
          <div>Travel Time: {{ poi.duration }}</div>
        </div>
      </div>
      
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
export default {
  name: 'App',
  data() {
    return {
      homeAddress: '',
      pointsOfInterest: [
        { name: 'Work', address: '', distance: null, duration: null },
        { name: 'Costco', address: '', distance: null, duration: null },
        { name: 'Grocery Store', address: '', distance: null, duration: null },
        { name: 'Hardware Store', address: '', distance: null, duration: null }
      ],
      map: null,
      geocoder: null,
      directionsService: null,
      directionsRenderers: [],
      markers: [],
      autocompletes: []
    }
  },
  mounted() {
    this.initializeMap()
  },
  methods: {
    clearMap() {
      // Clear all existing routes
      this.directionsRenderers.forEach(renderer => renderer.setMap(null))
      this.directionsRenderers = []

      // Clear all existing markers
      this.markers.forEach(marker => marker.setMap(null))
      this.markers = []

      // Reset distance and duration for all POIs
      this.pointsOfInterest.forEach(poi => {
        poi.distance = null
        poi.duration = null
      })
    },
    initializeMap() {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_VUE_APP_GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
      script.async = true
      script.defer = true
      script.onload = () => {
        this.map = new google.maps.Map(this.$refs.mapRef, {
          center: { lat: 37.7749, lng: -122.4194 },
          zoom: 12
        })
        this.geocoder = new google.maps.Geocoder()
        this.directionsService = new google.maps.DirectionsService()
        
        // Initialize autocomplete for home address
        this.initializeAutocomplete(this.$refs.homeAddressInput, 'home')
        
        // Initialize autocomplete for existing POIs
        this.pointsOfInterest.forEach((_, index) => {
          this.initializeAutocomplete(this.$refs['poiAddress_' + index][0], index)
        })
      }
      document.head.appendChild(script)
    },
    initializeAutocomplete(input, index) {
      const autocomplete = new google.maps.places.Autocomplete(input)
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (index === 'home') {
          this.homeAddress = place.formatted_address
        } else {
          this.pointsOfInterest[index].address = place.formatted_address
        }
        // Clear the map when any address changes
        this.clearMap()
      })
      this.autocompletes.push(autocomplete)
    },
    addPOI() {
      this.pointsOfInterest.push({
        name: '',
        address: '',
        distance: null,
        duration: null
      })
      // Initialize autocomplete for new POI after DOM update
      this.$nextTick(() => {
        const newIndex = this.pointsOfInterest.length - 1
        this.initializeAutocomplete(this.$refs['poiAddress_' + newIndex][0], newIndex)
      })
    },
    removePOI(index) {
      this.pointsOfInterest.splice(index, 1)
      this.clearMap()
    },
    async calculateRoutes() {
      if (!this.homeAddress || !this.directionsService) {
        alert('Please enter a home address and ensure all services are loaded')
        return
      }

      const validPOIs = this.pointsOfInterest.filter(poi => poi.address)
      if (validPOIs.length === 0) {
        alert('Please enter at least one destination address')
        return
      }

      // Clear existing routes and markers before calculating new ones
      this.clearMap()

      // Calculate route for each POI
      for (let i = 0; i < this.pointsOfInterest.length; i++) {
        const poi = this.pointsOfInterest[i]
        if (!poi.address) continue

        try {
          const directionsRenderer = new google.maps.DirectionsRenderer({
            map: this.map,
            preserveViewport: true,
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: this.getRouteColor(i),
              strokeOpacity: 0.7,
              strokeWeight: 4
            }
          })
          this.directionsRenderers.push(directionsRenderer)

          const result = await this.calculateRoute(this.homeAddress, poi.address, directionsRenderer)
          
          // Update POI with distance and duration
          const route = result.routes[0]
          const leg = route.legs[0]
          poi.distance = leg.distance.text
          poi.duration = leg.duration.text
        } catch (error) {
          console.error('Error calculating route:', error)
          poi.distance = 'Cannot calculate'
          poi.duration = 'Cannot calculate'
        }
      }

      // Add markers after routes are drawn
      this.updateMapMarkers()
    },
    calculateRoute(origin, destination, renderer) {
      return new Promise((resolve, reject) => {
        this.directionsService.route({
          origin,
          destination,
          travelMode: 'DRIVING'
        }, (result, status) => {
          if (status === 'OK') {
            renderer.setDirections(result)
            resolve(result)
          } else {
            reject(status)
          }
        })
      })
    },
    getRouteColor(index) {
      const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFA500', '#800080', '#008080', '#FFD700', '#FF69B4']
      return colors[index % colors.length]
    },
    async updateMapMarkers() {
      if (!this.map || !this.geocoder) return

      // Clear existing markers
      this.markers.forEach(marker => marker.setMap(null))
      this.markers = []

      try {
        // Add home marker
        const homeResult = await this.geocoder.geocode({ address: this.homeAddress })
        if (homeResult.results[0]) {
          const homePosition = homeResult.results[0].geometry.location
          
          const homeMarker = new google.maps.Marker({
            map: this.map,
            position: homePosition,
            icon: {
              url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
            },
            title: 'Home',
            zIndex: google.maps.Marker.MAX_ZINDEX + 1
          })
          this.markers.push(homeMarker)
        }

        // Add POI markers
        for (const [index, poi] of this.pointsOfInterest.entries()) {
          if (poi.address) {
            const result = await this.geocoder.geocode({ address: poi.address })
            if (result.results[0]) {
              const marker = new google.maps.Marker({
                map: this.map,
                position: result.results[0].geometry.location,
                title: poi.name || 'POI',
                label: {
                  text: (index + 1).toString(),
                  color: 'white'
                }
              })
              this.markers.push(marker)
            }
          }
        }

        // Adjust map bounds to show all markers
        const bounds = new google.maps.LatLngBounds()
        this.markers.forEach(marker => bounds.extend(marker.getPosition()))
        this.map.fitBounds(bounds)
      } catch (error) {
        console.error('Error updating markers:', error)
      }
    }
  }
}
</script>