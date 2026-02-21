import { io } from "socket.io-client";

// Connect to the same host as the window
const socket = io();

export const emitDataUpdated = () => {
  socket.emit("data_updated");
};

export const onDataUpdated = (callback: () => void) => {
  socket.on("data_updated", callback);
  return () => {
    socket.off("data_updated", callback);
  };
};

export default socket;
