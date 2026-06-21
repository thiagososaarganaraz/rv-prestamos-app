import { Database } from "lucide-react";

export function DatabaseIndicator() {
  const environment = process.env.NEXT_PUBLIC_APP_ENV || "development";

  const getEnvColor = () => {
    switch (environment) {
      case "production":
        return "text-green-500";
      case "qa":
        return "text-yellow-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div 
      className="flex items-center justify-center p-2 rounded-full hover:bg-accent transition-colors"
      title={`Ambiente: ${environment}`}
    >
      <Database className={`w-5 h-5 ${getEnvColor()}`} />
    </div>
  );
}