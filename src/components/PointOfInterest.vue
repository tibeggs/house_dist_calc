<!-- components/PointOfInterest.vue -->
<template>
    <div class="mb-4 p-3 border rounded text-black">
      <div class="flex gap-2 mb-2">
        <input 
          v-model="poi.name"
          class="w-1/4 p-2 border rounded"
          placeholder="Location name"
        />
        <input 
          ref="addressInput"
          class="w-2/3 p-2 border rounded"
          placeholder="Address"
        />
        <button 
          @click="$emit('remove')"
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
  </template>
  
  <script>
  export default {
    name: 'PointOfInterest',
    props: {
      poi: {
        type: Object,
        required: true
      },
      mapService: {
        type: Object,
        required: true
      }
    },
    async mounted() {
      await this.$nextTick();
      if (this.mapService.isGoogleMapsLoaded) {
        this.initializeAutocomplete();
      }
    },
    watch: {
      'mapService.isGoogleMapsLoaded': {
        handler(isLoaded) {
          if (isLoaded) {
            this.initializeAutocomplete();
          }
        },
        immediate: true
      }
    },
    methods: {
      initializeAutocomplete() {
        const autocomplete = this.mapService.initializeAutocomplete(this.$refs.addressInput);
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          this.$emit('update:poi', {
            ...this.poi,
            address: place.formatted_address
          });
          this.$emit('address-changed');
        });
      }
    }
  }
  </script>