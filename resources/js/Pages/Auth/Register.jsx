import { Head, Link, useForm } from '@inertiajs/react';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import AppLogo from '@/Components/AppLogo';

export default function Register() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/register');
    };

    return (
        <GuestLayout title="Create account">
            <Head title="Register" />

            <div className="mb-6 flex justify-center">
                <AppLogo className="h-14 w-auto" />
            </div>

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <TextInput
                        type="text"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                    />
                    <InputError message={errors.name} />
                </div>

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

                <div>
                    <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                    <TextInput
                        type="password"
                        value={data.password_confirmation}
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        required
                    />
                </div>

                <div className="flex items-center justify-between">
                    <Link href="/login" className="text-sm text-indigo-600 hover:text-indigo-500">
                        Already registered?
                    </Link>
                    <PrimaryButton disabled={processing}>Register</PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
