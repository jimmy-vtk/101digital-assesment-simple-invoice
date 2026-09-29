export interface JwtPayload {
  /** User id. */
  sub: string;
  email: string;
}

/** Attached to `request.user` by JwtStrategy. */
export interface AuthenticatedUser {
  id: string;
  email: string;
}
