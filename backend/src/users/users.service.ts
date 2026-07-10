import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { UsersRepository } from './users.repository';
import { AuthenticatedUser } from '../auth/firebase-auth.guard';
import { Household, MeResponse } from './interfaces/user.interface';

/** Unambiguous alphabet (no O/0, I/1) for invite codes typed on a phone */
const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  /**
   * Bootstrap endpoint: returns the profile + household for the signed-in user,
   * creating both on first sign-in (every new account gets its own household).
   */
  async getOrCreateMe(auth: AuthenticatedUser): Promise<MeResponse> {
    let user = await this.usersRepository.findUser(auth.uid);

    if (!user) {
      const household = await this.usersRepository.createHousehold('Moje domaćinstvo', auth.uid, this.generateInviteCode());
      user = await this.usersRepository.saveUser(auth.uid, {
        displayName: auth.name || auth.email || 'Korisnik',
        email: auth.email,
        photoURL: auth.picture,
        householdId: household.id,
        webhookToken: this.generateWebhookToken()
      });
      this.logger.log(`New user ${auth.uid} (${user.displayName}) with household ${household.id}`);
    } else if (!user.webhookToken) {
      await this.usersRepository.setWebhookToken(auth.uid, this.generateWebhookToken());
      user = (await this.usersRepository.findUser(auth.uid))!;
    }

    return this.buildMeResponse(user.uid, user.householdId);
  }

  /** Joins the household matching the invite code; leaves (and cleans up) the previous one. */
  async joinHousehold(auth: AuthenticatedUser, code: string): Promise<MeResponse> {
    const normalized = (code || '').trim().toUpperCase();
    if (normalized.length < 4) {
      throw new BadRequestException('Nevažeći kod za pridruživanje');
    }

    const target = await this.usersRepository.findHouseholdByInviteCode(normalized);
    if (!target) {
      throw new BadRequestException('Kod ne postoji — proveri sa osobom koja te poziva');
    }

    const me = await this.getOrCreateMe(auth);
    const current = me.user.householdId;

    if (current === target.id) {
      return me;
    }

    await this.usersRepository.addMember(target.id, auth.uid);
    await this.usersRepository.updateUserHousehold(auth.uid, target.id);

    // Clean up the previous household if this user was its only member
    const previous = await this.usersRepository.findHousehold(current);
    if (previous.memberUids.length === 1 && previous.memberUids[0] === auth.uid) {
      await this.usersRepository.deleteHousehold(previous.id);
      this.logger.log(`Deleted empty household ${previous.id} after ${auth.uid} joined ${target.id}`);
    } else {
      await this.usersRepository.removeMember(previous.id, auth.uid);
    }

    return this.buildMeResponse(auth.uid, target.id);
  }

  /** Generates a fresh invite code for the caller's household. */
  async regenerateInviteCode(auth: AuthenticatedUser): Promise<MeResponse> {
    const me = await this.getOrCreateMe(auth);
    await this.usersRepository.setInviteCode(me.user.householdId, this.generateInviteCode());
    return this.buildMeResponse(auth.uid, me.user.householdId);
  }

  private async buildMeResponse(uid: string, householdId: string): Promise<MeResponse> {
    const [user, household] = await Promise.all([this.usersRepository.findUser(uid), this.usersRepository.findHousehold(householdId)]);
    const members = await this.usersRepository.findUsers(household.memberUids);
    return {
      user: user!,
      household: {
        ...household,
        members: members.map(member => ({ uid: member.uid, displayName: member.displayName, photoURL: member.photoURL }))
      }
    };
  }

  private generateInviteCode(): string {
    const bytes = randomBytes(6);
    return Array.from(bytes, byte => INVITE_ALPHABET[byte % INVITE_ALPHABET.length]).join('');
  }

  /** Human-typeable token for the MacroDroid HTTP header, e.g. "troskic-A7KM2Q9RTZ" */
  private generateWebhookToken(): string {
    const bytes = randomBytes(10);
    const suffix = Array.from(bytes, byte => INVITE_ALPHABET[byte % INVITE_ALPHABET.length]).join('');
    return `troskic-${suffix}`;
  }
}

export type { Household };
