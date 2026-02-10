export default function TextInput({ className = '', ...props }) {
    return (
        <input
            {...props}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${className}`}
        />
    );
}
