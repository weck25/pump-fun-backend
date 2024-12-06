declare module '@metaplex-foundation/mpl-token-metadata' {
    export const METADATA_PROGRAM_ID: string;
    export class Metadata {
        static findProgramAddress(args: any): Promise<[string, number]>;
    }
}