import { onBeforeUnmount, onMounted, readonly, ref } from 'vue'

// Общая модальность ввода: программный возврат фокуса из меню не должен выглядеть как нажатие Tab.
const keyboard = ref(false)
let users = 0
const onKey = () => { keyboard.value = true }
const onPointer = () => { keyboard.value = false }

export function useKeyboardInput() {
  onMounted(() => {
    if (users++ > 0) return
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('pointerdown', onPointer, true)
  })
  onBeforeUnmount(() => {
    if (--users > 0) return
    document.removeEventListener('keydown', onKey, true)
    document.removeEventListener('pointerdown', onPointer, true)
    keyboard.value = false
  })
  return readonly(keyboard)
}
