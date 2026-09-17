export interface User {
  id: string;
  name: string;
  email: string;
  organizationName: string;
  createdAt: string;
}

export interface AuthResult {
  user: User;
  token: string;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface Registration extends Credentials {
  name: string;
  organizationName?: string;
}
