import type {
  CurrentPageDraftWriteCommand,
  CurrentPageReadCommand,
  CurrentPageRepository,
  CurrentPageService,
  CurrentPublishCommand,
  CurrentResult,
  CurrentPageDraftSnapshot,
  CurrentPagePreviewSnapshot,
  CurrentPublicationSnapshot,
} from "@/lib/current/contracts";

export function createCurrentPageService(repository: CurrentPageRepository): CurrentPageService {
  return {
    getOwnerPage(command: CurrentPageReadCommand): Promise<CurrentResult<CurrentPublicationSnapshot>> {
      return repository.getPublicationForActor(command);
    },

    getOwnerDraft(command: CurrentPageReadCommand): Promise<CurrentResult<CurrentPageDraftSnapshot>> {
      return repository.getDraftForActor(command);
    },

    saveOwnerDraft(command: CurrentPageDraftWriteCommand): Promise<CurrentResult<CurrentPageDraftSnapshot>> {
      return repository.saveDraftForActor(command);
    },

    async previewOwner(
      command: CurrentPageReadCommand,
    ): Promise<CurrentResult<CurrentPagePreviewSnapshot>> {
      const draft = await repository.getDraftForActor(command);
      if (!draft.ok) {
        return draft;
      }

      const publication = await repository.getPublicationForActor(command);
      if (!publication.ok) {
        return publication;
      }

      return {
        ok: true,
        value: {
          draft: draft.value,
          publication: publication.value,
        },
      };
    },

    publishOwner(command: CurrentPublishCommand): Promise<CurrentResult<CurrentPublicationSnapshot>> {
      return repository.publish(command);
    },
  };
}
