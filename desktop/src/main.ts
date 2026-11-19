import { createApp } from 'vue'
import App from './App.vue'
import { i18n, setLocale } from './i18n'
import './styles/base.css'

setLocale(navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en')
createApp(App).use(i18n).mount('#app')
