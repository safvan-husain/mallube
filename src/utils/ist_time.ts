
export const getIST = () => {
    return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}