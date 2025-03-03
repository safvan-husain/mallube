
export const getIST = () => {
    return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

export const createdAtIST = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // Convert 5.5 hours to milliseconds
  return new Date(now.getTime() + istOffset);
};



export function formatLastPurchaseDate(lastPurchaseDate: string): string {
  const now = new Date(); // Current date and time
  const purchaseDate = new Date(lastPurchaseDate); // Convert the lastPurchaseDate to a Date object

  // Calculate the difference in milliseconds
  const diffInMs = now.getTime() - purchaseDate.getTime();

  // Convert milliseconds to seconds, minutes, hours, days, etc.
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);

  // Determine the appropriate string based on the difference
  if (diffInSeconds < 60) {
    return "just now";
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
  } else if (diffInDays === 1) {
    return "yesterday";
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
  } else if (diffInWeeks === 1) {
    return "1 week ago";
  } else if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks === 1 ? "" : "s"} ago`;
  } else {
    // For longer durations, return the actual date
    return `on ${purchaseDate.toLocaleDateString()}`;
  }
}

export function DateFromMilliSecondSinceEpoach(timestamp: number): Date {
  return new Date(timestamp);
}

//using this when we don't care about the date coming from client, since we are focusing on time, 
//this will help us sort items, even if they are added or updated frok different dates. 
export function toTimeOnly(timestamp: number): Date {
  const date = new Date(timestamp);
  return new Date(1970, 0, 1, date.getHours(), date.getMinutes(), date.getSeconds());
}