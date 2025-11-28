import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user; // { sub: userId, walletAddress }
    
    // If data is provided (e.g., 'sub'), return that property
    return data ? user?.[data] : user;
  },
);
