import forwardedParse from "forwarded-parse";
import { isIP } from "is-ip";
import { Socket } from "socket.io";

/**
 * Given a socket, returns the IP address of the client.
 *
 * This function will try to find the most accurate IP address, based on headers and other data.
 */
export function getClientIp(socket: Socket): string {
  return (
    checkedIp(getXForwardedFor(socket)) ||
    checkedIp(getForwarded(socket)) ||
    checkedIp(getCloudflareHeaders(socket)) ||
    socket.handshake.address
  );
}

function checkedIp(ip: string | undefined) {
  return ip && isIP(ip) ? ip : undefined;
}

function getXForwardedFor(socket: Socket) {
  return [socket.handshake.headers["x-forwarded-for"] ?? []]
    .flat()
    .map((forwardedFor) => forwardedFor.split(",")[0]?.trim())
    .filter(Boolean)[0];
}

function getForwarded(socket: Socket) {
  try {
    const forwardedHeader = socket.handshake.headers["forwarded"];
    return forwardedHeader
      ? forwardedParse(forwardedHeader)[0]?.for
      : undefined;
  } catch {
    return undefined;
  }
}

function getCloudflareHeaders(socket: Socket) {
  return socket.handshake.headers["cf-connecting-ip"]?.[0];
}
