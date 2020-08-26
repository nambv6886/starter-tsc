declare namespace Express {
    export interface Request {
      currentUser: {
        email: string;
        userId: number;
      };
    }
  }
  