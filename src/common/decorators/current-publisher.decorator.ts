import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentPublisher = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // PublisherJwtStrategy.validate() 반환 값
  },
);
