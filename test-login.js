import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Carregar .env.local manualmente para este teste
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY

console.log('Testing Supabase Connection...')
console.log('URL:', url)
console.log('Key length:', key?.length)

if (!url || !key) {
    console.error('CRITICAL: Missing credentials in .env.local')
    process.exit(1)
}

const supabase = createClient(url, key)

async function testLogin() {
    console.log('Attempting login with: admin@elergos.pt')
    // Substituir password aqui pela que o user está a tentar, ou pedir para ele editar
    const email = 'pedro@elergos.pt'
    const password = '' // Placeholder

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    })

    if (error) {
        console.error('LOGIN FAILED:', error.message)
        console.error('Error Status:', error.status)
    } else {
        console.log('LOGIN SUCCESS!')
        console.log('User ID:', data.user.id)
        console.log('Email:', data.user.email)
    }
}

testLogin()
