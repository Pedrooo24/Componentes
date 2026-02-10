import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(url, key)

async function createUser() {
    const email = 'teste_auto@elergos.pt'
    const password = 'PasswordSegura123!'

    console.log(`Creating user: ${email}`)

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { display_name: 'Teste Auto' }
        }
    })

    if (error) {
        console.error('SIGN UP FAILED:', error.message)
    } else {
        console.log('SIGN UP SUCCESS!')
        console.log('User ID:', data.user?.id)
        console.log('Is Confirmed:', data.user?.aud === 'authenticated' ? 'YES' : 'NO (Check Email/Dashboard)')

        // Try login immediately
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
        if (loginError) {
            console.error('IMMEDIATE LOGIN FAILED:', loginError.message)
        } else {
            console.log('IMMEDIATE LOGIN SUCCESS!')
        }
    }
}

createUser()
