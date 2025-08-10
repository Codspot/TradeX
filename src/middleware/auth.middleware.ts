// import {
//     Injectable,
//     NestMiddleware,
//     UnauthorizedException,
//   } from '@nestjs/common';
//   import { JwtService } from '@nestjs/jwt';
//   import { AuthenticationService } from 'src/app/services/authentication.service';
  
//   @Injectable()
//   export class AuthMiddleware implements NestMiddleware {
//     constructor(
//       private readonly jwtService: JwtService,
//       private readonly authenticationService: AuthenticationService,
//     ) {}
  
//     async use(req: any, res: any, next: () => void) {
//       const authHeader = req.headers.authorization;
  
//       // Clear or reset the access-token header initially
//       res.setHeader('access-token', '');
//       if (!authHeader || !authHeader.startsWith('Bearer ')) {
//         throw new UnauthorizedException('Token not found');
//       }
//       const refreshToken = req.headers['refresh-token'];
      
//       if (!refreshToken) {
//         throw new UnauthorizedException('Refresh token not found');
//       }
  
//       const token = authHeader.split(' ')[1];
      
//       try {
//         // Verify the access token
//         const decoded = this.jwtService.verify(token);
//         req.user = decoded;
//         next();
//       } catch (err) {
//         // Token validation failed, attempt to refresh it
//         try {
//           const payload = this.authenticationService.verifyToken(refreshToken);
//           const accessToken = this.authenticationService.generateAccessToken(payload);
          
//           // Update request user with the new payload and set new access token in the header
//           req.user = payload;
//           res.setHeader('access-token', `Bearer ${accessToken}`);
//           res.setHeader('Access-Control-Expose-Headers', 'access-token');
//           next();
//         } catch (refreshErr) {
//           // Both access and refresh tokens are invalid
//           throw new UnauthorizedException('Refresh token is expired or invalid');
//         }
//       }
//     }
//   }
  