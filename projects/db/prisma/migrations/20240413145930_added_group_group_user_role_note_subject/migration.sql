/*
  Warnings:

  - You are about to drop the column `name` on the `Subject` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Subject] DROP COLUMN [name];
ALTER TABLE [dbo].[Subject] ADD [city] NVARCHAR(1000),
[country] NVARCHAR(1000),
[date_of_birth] DATETIME2,
[father_name] NVARCHAR(1000),
[first_name] NVARCHAR(1000),
[last_name] NVARCHAR(1000),
[middle_name] NVARCHAR(1000),
[mother_name] NVARCHAR(1000),
[postal_code] NVARCHAR(1000),
[sex] NVARCHAR(1000),
[street] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[Group] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [sql_where] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Group_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2,
    CONSTRAINT [Group_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[GroupUserRole] (
    [id] NVARCHAR(1000) NOT NULL,
    [group_id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [GroupUserRole_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2,
    CONSTRAINT [GroupUserRole_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Note] (
    [id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [entity_id] NVARCHAR(1000) NOT NULL,
    [entity_type] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Note_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2,
    CONSTRAINT [Note_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[GroupUserRole] ADD CONSTRAINT [GroupUserRole_group_id_fkey] FOREIGN KEY ([group_id]) REFERENCES [dbo].[Group]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[GroupUserRole] ADD CONSTRAINT [GroupUserRole_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Note] ADD CONSTRAINT [Note_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
