import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import ToastService from 'primevue/toastservice'
import router from './router'

import App from './App.vue'
import './style.css'
import 'primeicons/primeicons.css'

const app = createApp(App)

// Pinia state management
app.use(createPinia())

// Vue Router
app.use(router)

// PrimeVue UI library
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',
      darkModeSelector: '.dark-mode',
      cssLayer: false
    }
  }
})

// Toast notifications
app.use(ToastService)

app.mount('#app')
