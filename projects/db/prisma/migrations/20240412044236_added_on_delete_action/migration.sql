BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[AuthChallenge] DROP CONSTRAINT [AuthChallenge_user_id_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[Issue] DROP CONSTRAINT [Issue_subject_id_fkey];

-- AddForeignKey
ALTER TABLE [dbo].[AuthChallenge] ADD CONSTRAINT [AuthChallenge_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Issue] ADD CONSTRAINT [Issue_subject_id_fkey] FOREIGN KEY ([subject_id]) REFERENCES [dbo].[Subject]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
