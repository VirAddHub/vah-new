export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24 bg-background">
            <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
                <h1 className="text-4xl font-bold text-foreground">VirtualAddressHub</h1>
            </div>

            <div className="relative flex place-items-center">
                <h2 className="text-2xl text-foreground">Professional Virtual Address Service</h2>
            </div>

            {/* Tailwind Test */}
            <div className="p-6 bg-red-500 text-white rounded-lg">
                Tailwind CSS is working! 🎉
            </div>
        </main>
    )
}
