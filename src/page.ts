const button = document.getElementById("pick-folder");
const output = document.getElementById("folder-path");

button?.addEventListener("click", async () => {
    console.log("click");
    const folder = await window.api.selectFolder();
    if (output) {
        output.textContent = folder ?? "No folder selected";
    }
});
