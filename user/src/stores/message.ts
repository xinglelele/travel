import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Message {
    id: string
    type: 'system' | 'route' | 'comment' | 'activity'
    title: string
    content: string
    isRead: boolean
    createdAt: string
    extra?: Record<string, unknown>
}

export const useMessageStore = defineStore('message', () => {
    const messages = ref<Message[]>([])
    const loading = ref(false)

    const unreadCount = computed(() => messages.value.filter(m => !m.isRead).length)

    function setMessages(list: Message[]) {
        messages.value = list
    }

    function markRead(id: string) {
        const msg = messages.value.find(m => m.id === id)
        if (msg) msg.isRead = true
    }

    function markAllRead() {
        messages.value.forEach(m => { m.isRead = true })
    }

    function setLoading(val: boolean) {
        loading.value = val
    }

    return {
        messages, loading, unreadCount,
        setMessages, markRead, markAllRead, setLoading
    }
})
