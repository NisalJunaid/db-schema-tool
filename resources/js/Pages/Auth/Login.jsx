import { Head, Link, useForm } from '@inertiajs/react';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import AppLogo from '@/Components/AppLogo';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post('/login');
    };

    return (
        <GuestLayout title="Sign in">
            <Head title="Log in" />

            <div className="mb-6 flex justify-center">
                <AppLogo className="h-10 w-auto" />
            </div>

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <TextInput
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />
                    <InputError message={errors.email} />
                </div>

                <div>
                    <label className="text-sm font-medium text-gray-700">Password</label>
                    <TextInput
                        type="password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />
                    <InputError message={errors.password} />
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                        type="checkbox"
                        checked={data.remember}
                        onChange={(e) => setData('remember', e.target.checked)}
                    />
                    Remember me
                </label>

                <div className="flex items-center justify-between">
                    <Link href="/register" className="text-sm text-indigo-600 hover:text-indigo-500">
                        Need an account?
                    </Link>
                    <PrimaryButton disabled={processing}>Log in</PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
