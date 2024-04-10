BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Subject] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [gov_id] NVARCHAR(1000),
    [phone] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Subject_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2,
    CONSTRAINT [Subject_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Issue] (
    [id] NVARCHAR(1000) NOT NULL,
    [subject_id] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000),
    [content] NVARCHAR(1000),
    [status] NVARCHAR(1000) CONSTRAINT [Issue_status_df] DEFAULT 'open',
    [priority] NVARCHAR(1000) CONSTRAINT [Issue_priority_df] DEFAULT 'normal',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Issue_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2,
    [userId] NVARCHAR(1000),
    CONSTRAINT [Issue_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Issue] ADD CONSTRAINT [Issue_subject_id_fkey] FOREIGN KEY ([subject_id]) REFERENCES [dbo].[Subject]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Issue] ADD CONSTRAINT [Issue_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
