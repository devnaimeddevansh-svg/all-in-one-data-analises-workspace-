import { startWorkers } from "@/lib/queue";

console.log("Starting NexusOS background workers...");
startWorkers();
console.log("Workers started. Listening for jobs...");
