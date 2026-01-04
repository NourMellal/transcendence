import type {
    GetPresenceInputDTO,
    PresenceResponseDTO,
    UpdatePresenceInputDTO
} from '../../../application/dto/presence.dto';

export interface IGetPresenceUseCase {
    execute(input: GetPresenceInputDTO): Promise<PresenceResponseDTO | null>;
}

export interface IUpdatePresenceUseCase {
    execute(input: UpdatePresenceInputDTO): Promise<void>;
}
