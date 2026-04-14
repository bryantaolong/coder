import { GitTool } from "@/tools";

async function main() {
    const git = new GitTool();
    console.log("\n");
    console.log("Git Status:", await git.status());
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});