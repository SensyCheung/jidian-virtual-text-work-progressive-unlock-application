# JiDian吉店 Virtual Text Work Progressive Unlock Application

## Overview
An application that allows users to publish text-based, image-based, file-based, and audio-based virtual works with progressive content unlocking functionality based on received payments within configurable time windows.

Brand tagline: Drop by drop funding, step by step unlocking.

## Core Features

### Favicon and Icon Support
- Frontend `index.html` includes proper favicon and icon link tags for browser tab display and mobile bookmarks
- Uses provided favicon asset (`generated/jidian-favicon.dim_32x32.png`) for browser tab icons
- Uses provided logo asset (`generated/jidian-logo-transparent.dim_200x200.png`) for general branding
- Uses provided Apple touch icon asset (`generated/jidian-apple-touch-icon.dim_180x180.png`) for iOS home screen bookmarks
- Implements proper `<link rel="icon" ...>` and `<link rel="apple-touch-icon" ...>` tags with correct sizes and formats
- Favicon displays correctly in both light and dark theme browser modes
- Icons appear properly in browser tabs, bookmarks, and mobile device home screens

### Comprehensive Bilingual Language Support
- Complete bilingual support for English and Chinese languages across all application components
- Default language: Chinese
- Language toggle/dropdown in header or footer allowing users to switch between English and Chinese
- User language preference stored in localStorage and persists across sessions, logout, and page reload
- Global language context or i18n provider managing translation state across the entire SPA
- Translation files (en.json / zh.json) containing all UI text keys, avoiding hardcoded text in components
- All UI components dynamically display text based on currently selected language:
  - Header navigation and branding
  - AboutPage content including all descriptive text and headings
  - ProductList and ProductCard text including work titles, author names, progress indicators
  - ProductDetailModal content and labels including funding progress, unlock status messages
  - CreateProductModal and EditProductModal form fields, buttons, validation messages, placeholders, and tooltips
  - LoginPrompt messages and authentication-related text
  - AdminDashboard interface text including work management labels, status indicators, delete confirmations, anonymous posting control toggle, Google Analytics settings menu
  - ArticleDetailPage content including work details, progress bars, receipt records, navigation elements
  - ProfileSetupModal form fields, labels, save/cancel buttons, validation messages
  - Error messages, notifications, and user feedback across all components
  - Progress indicators and status messages including funding percentages, unlock notifications
  - Button labels and tooltips throughout the application
  - Menu items, dialog boxes, confirmation prompts
  - Dynamic content such as funding progress text, unlock messages, receipt record labels
  - System notifications including success/error alerts, loading states
  - Modal headers, footers, and action buttons
  - Placeholder text for all input fields and text areas
  - Help text and instructional content
  - Date/time formatting and display text
  - File upload and download related messages
  - Random unlock mode indicators and character progress displays
  - Time window configuration options and auto-lock status indicators
  - Anonymous user display names and related interface text
  - Admin settings labels and descriptions for anonymous posting control and Google Analytics configuration
  - Audio work interface elements including upload controls, streaming player controls, progressive unlock indicators, and audio-specific status messages
  - Google Analytics settings interface including tracking ID input, enable/disable toggle, configuration labels, and related prompts

### Fixed Authentication Flow and Infinite Refresh Prevention
- **Authentication state initialization safeguards**: `useInternetIdentity` hook ensures Internet Identity session, admin flag, and localStorage values are fully initialized before triggering any navigation or re-render
- **Reload loop prevention**: Authentication flow prevents repeated reloads or redirects during identity state transitions by implementing proper state guards and initialization checks
- **SPA router safeguards**: Deep-link logic includes safe guards to skip redirection if authentication status is already resolved, preventing infinite redirect loops
- **Component initialization order**: App.tsx ensures proper initialization sequence of Internet Identity session, admin status verification, and localStorage setup before rendering main application content
- **State transition handling**: Authentication state changes are handled gracefully without triggering unnecessary re-renders or navigation events
- **Browser compatibility fixes**: Authentication flow is specifically tested and optimized for Windows Chrome to prevent infinite refresh issues
- **GA initialization safeguards**: Google Analytics initialization waits for authentication state to be fully resolved before loading scripts to prevent reload loops
- **Language context safeguards**: Language context initialization is decoupled from authentication state changes to prevent triggering reload loops when user state updates
- **Eruda initialization safeguards**: Mobile debug console initialization waits for admin status to be fully determined before loading to prevent authentication-related reload loops
- **Authentication status persistence**: Proper localStorage management ensures authentication status persists correctly across page reloads without triggering infinite refresh cycles
- **Identity state validation**: Authentication flow includes validation checks to ensure identity state is stable before proceeding with application initialization
- **Cross-browser authentication compatibility**: Authentication flow is tested and verified across different browsers, with specific attention to Windows Chrome compatibility

### User Authentication and Personal Settings
- Users can log in through the authentication system
- Provides a dedicated personal center page, accessible by authenticated users through header navigation (avatar or menu)
- Personal center page displays and edits user's display name and Principal address
- Calls backend `saveCallerUserProfile` and `setUserPrincipal` functions to persist updates when saving
- Integrates existing `useQueries` hook for loading and saving user profile data
- Includes form validation and success/error notification alerts
- Provides clear display of current name and Principal with "Save" and "Cancel" buttons
- All personal center interface elements support bilingual display

### Admin Dashboard
- Admin dashboard accessible only to the first initialized admin user (reuses existing AccessControl)
- Admin dashboard features:
  - Lists all works including deleted/hidden ones, sorted by publication date from newest to oldest
  - Supports soft delete functionality - when admin deletes a work, it becomes hidden from all users except the original creator
  - Clear status indicators showing normal vs deleted works
  - Delete actions for each work in the admin work list
  - Each work entry clearly displays the author's name alongside the title
  - **Anonymous posting control toggle**: Admin can enable/disable anonymous user publishing with toggle labeled "Allow anonymous users to publish articles" with default state ON
  - **Google Analytics settings menu**: Admin can configure Google Analytics tracking with input field for tracking ID (e.g., `G-XXXXXXX`) and enable/disable toggle for analytics tracking
  - **Global settings management**: Admin settings including anonymous posting permission and Google Analytics configuration are stored in backend and persist across sessions
- Frontend includes "Admin入口" navigation link visible only to admin users
- Implements dedicated Admin Work List page with management capabilities
- All admin interface elements, labels, messages, anonymous posting control, and Google Analytics configuration support bilingual display

### Google Analytics Integration
- **Backend stores Google Analytics configuration settings accessible only to admin users**:
  - Google Analytics tracking ID (e.g., `G-XXXXXXX`)
  - Analytics enabled/disabled status (default: disabled)
- **Backend provides `getAnalyticsSettings` and `updateAnalyticsSettings` endpoints for admin to manage Google Analytics configuration**
- **Frontend Google Analytics settings interface in Admin Dashboard**:
  - Input field for Google Analytics tracking ID with validation for proper format
  - Toggle switch to enable/disable Google Analytics tracking
  - Save and cancel buttons with success/error feedback
  - Bilingual labels and descriptions for all Google Analytics configuration elements
- **Dynamic Google Analytics script injection**:
  - Frontend loads Google Analytics configuration on app initialization
  - If analytics is enabled and tracking ID is provided, dynamically injects Google Analytics script
  - If analytics is disabled, no tracking scripts are loaded
- **Automatic page view and event tracking**:
  - Integrates with `react-router` to automatically track page views on navigation
  - Tracks key user events and interactions throughout the application
  - Respects user privacy by only tracking when explicitly enabled by admin
- **Google Analytics configuration validation**:
  - Frontend validates tracking ID format before saving
  - Backend validates admin permissions before allowing configuration changes
  - Provides appropriate error messages for invalid configurations
- All Google Analytics related interface elements, configuration labels, validation messages, and prompts support bilingual display

### Anonymous Publishing Control
- **Backend stores global setting for anonymous posting permission (default: enabled)**
- **Backend `createWork` function validates anonymous posting permission**:
  - If anonymous posting is disabled and user is not authenticated, returns authorization error
  - If anonymous posting is enabled and user is not authenticated, allows creation with author set to "Anonymous User" / "匿名用户"
  - If user is authenticated, uses their display name as author regardless of anonymous posting setting
- **Backend provides `getSettings` and `updateSettings` endpoints for admin to manage anonymous posting permission**
- **Frontend displays "Anonymous User" / "匿名用户" for works created by anonymous users across all components**:
  - ProductList and ProductCard components show anonymous user label when creator lacks profile name
  - ProductDetailModal displays anonymous user label for anonymous works
  - ArticleDetailPage shows anonymous user label for anonymous creators
  - Admin dashboard displays anonymous user label in work listings
- **Frontend work creation respects anonymous posting setting**:
  - When anonymous posting is disabled, shows login prompt for unauthenticated users attempting to create works
  - When anonymous posting is enabled, allows anonymous users to create works with automatic anonymous author assignment
- All anonymous user labels and admin control interface support bilingual display

### User Settings
- Users can set and store their own Principal address (not publicly displayed)
- Backend stores user Principal information for querying account ID cumulative receipts

### Time Window Configuration for Funding Calculation
- Work creation modal includes a new configuration option for funding time window selection
- Available time window options:
  - "Last 1 hour" / "最近1小时"
  - "Last 24 hours" / "最近24小时"
  - "Last 7 days" / "最近7天"
  - "Last 30 days" / "最近30天"
  - "Permanent" / "永久"
- Default selection: "Permanent" / "永久"
- Backend stores the selected time window setting as part of work metadata
- Time window configuration is immutable after work creation (cannot be changed during editing)
- All time window labels and descriptions support bilingual display

### Fixed Time-Based Funding Evaluation
- **Backend correctly calculates cumulative funding amount within each work's specific time window setting**
- **Backend balance query functions properly filter ICP transactions based on the work's configured TimeWindow (last1Hour, last24Hours, last7Days, last30Days, or permanent)**
- **Backend transfer record functions correctly apply time window filtering when querying transaction history**
- **Backend continuously evaluates whether works should be locked or unlocked based on current funding within their individual time window settings**
- **When funding within a work's specific time window falls below the target amount, that work automatically re-locks (dynamic re-encryption)**
- **When funding within a work's specific time window meets or exceeds the target amount, that work unlocks according to its progressive/random unlock settings**
- **Backend provides time-window-aware funding calculation functions that correctly integrate with existing progressive unlock logic using each work's TimeWindow setting**
- **Frontend progress display and unlocking logic correctly uses each work's specific time window setting when calculating received amounts**
- **Frontend "已收到" amount and progress percentage dynamically reflect the total received amount within that specific work's time window**
- **Auto re-locking and re-unlocking behavior works correctly when the time window expires or updates based on each work's individual TimeWindow configuration**

### Optimized Work Data Loading and Payload Management
- **Backend `getAllPaidWorks` function returns lightweight summary data only to prevent payload size issues**:
  - **Summary fields include**: id, title, author, workType, targetAmount, publishedAt, timeWindow, randomUnlock flag, and short content preview (up to ~200 characters)
  - **Excludes large fields**: full content, imageVersions, fileVersion, audioSegments, and embedded images to keep payload under 3MB
  - **Maintains comprehensive data validation**: filters out works with missing or invalid required metadata fields (id, title, creator, workType)
  - **Preserves backward compatibility**: supports all work types (text, image, file, audio) in summary format
- **Backend maintains existing `getWork` and `getWorkDetailsWithTimeWindow` functions for full work data retrieval**
- **Frontend implements two-tier data loading strategy**:
  - **Work lists use summary data**: ProductList and ProductCard components display works using lightweight summary data from `getAllPaidWorks`
  - **Detail pages fetch full data**: ArticleDetailPage and ProductDetailModal load complete work content using `getWork` or `getWorkDetailsWithTimeWindow` when user opens specific work
  - **Maintains existing functionality**: all progressive unlock, random unlock, audio streaming, and time window features work with full data in detail views
- **Frontend gracefully handles summary vs full data states**: loading indicators and error handling account for two-stage data loading process
- All optimized loading states and error messages support bilingual display

### Robust Work Data Validation and Filtering
- **Backend `getAllPaidWorks` function implements comprehensive data validation to filter out invalid or incomplete works**
- **Backend validates each work record for required metadata fields (id, title, creator, workType) before including in results**
- **Backend automatically skips works with missing, null, or corrupted essential data rather than failing the entire query**
- **Backend ensures all work types (text, image, file, audio) are properly validated and only complete records are returned**
- **Frontend work loading methods handle filtered results gracefully and display only valid works**
- **Frontend work count displays reflect only valid, complete works that pass backend validation**
- **Backend implements error logging for skipped invalid works to aid in debugging without blocking valid work retrieval**
- **Frontend loading states and error handling account for filtered results and provide appropriate user feedback**
- All validation error messages and loading states support bilingual display

### Virtual Work Publishing
Users can create new text-based, image-based, file-based, and audio-based virtual works with the following information:
- Work title
- Work type (text, image, file, or audio)
- For text works: Public/free content and paid content using rich text editor with WYSIWYG functionality
- For image works: Original image upload with automatic progressive version generation
- For file works: Single file upload (PDF, ZIP, EXE, DOCX, etc.) stored in Blob Storage
- For audio works: Single audio file upload (MP3, WAV) with **completely decoupled upload workflow using blobStorage.upload() independently from createWork submission**
- Target amount (price)
- Receiving account ID (reminder to use unique account ID for each work)
- **Funding time window selection** (Last 1 hour, Last 24 hours, Last 7 days, Last 30 days, or Permanent)
- Option to enable "progressive unlock" mode
- For text works: Option to enable "随机解锁" (random unlock) mode toggle
- For audio works: Option to enable progressive streaming unlock mode
- **Author display name (automatically set to authenticated user's display name or "Anonymous User" / "匿名用户" for anonymous users)**
- Publication timestamp (automatically set when created, cannot be modified when updated)
- **Anonymous publishing validation**: Backend enforces anonymous posting permission before allowing work creation
- All creation and editing interface elements support bilingual display

### Audio Work Creation Interface
- **CreateProductModal includes "Audio" tab alongside text/image/file type options**
- **Audio upload field supports .mp3 and .wav formats with validation rules**
- **Audio upload uses completely decoupled workflow: blobStorage.upload() sends audio files independently, then only file URL and metadata are passed to backend createWork function**
- **Toggle option for enabling "Progressive Streaming Unlock" for audio works**
- **All audio upload interface elements include bilingual labels and tooltips using existing i18n.ts**
- **Audio file validation displays appropriate error messages for unsupported formats or file size limits**
- **Audio upload progress indicator shows upload status and completion**

### Fully Decoupled Audio Upload Process
- **Frontend uploads MP3/WAV files using blobStorage.upload() completely independently from createWork canister call**
- **Audio files are uploaded to Blob Storage first and receive secure URLs before any backend interaction**
- **CreateProductModal and EditProductModal implement fully decoupled audio upload workflow**:
  - Step 1: Upload audio file to Blob Storage using blobStorage.upload() and receive secure URL
  - Step 2: Send work metadata with only audio file URL and metadata (not binary data) to backend via createWork canister call
  - Step 3: Backend processes audio file from blob URL for streaming segments
- **Backend createWork() and updateWork() functions accept only audio file URLs and metadata, never binary audio data**
- **Backend validates that audio work creation receives URLs, not file blobs**
- **Audio upload process maintains compatibility with progressive audio unlock and bilingual interface**
- **Upload progress indicators show both blob upload and canister processing stages**
- **Error handling covers both blob upload failures and canister processing failures**
- **Audio file size validation occurs before blob upload to prevent unnecessary uploads**
- **Request payload to createWork contains only text metadata and URLs, ensuring payload size remains under 2MB**
- All audio upload interface elements and error messages support bilingual display

### Audio Work Processing and Storage
- When users upload audio files (MP3, WAV) for audio-type works, **backend receives only audio file URLs from blobStorage, not binary data**
- Backend converts audio files into HLS (HTTP Live Streaming) format with .m3u8 playlist and .ts segment files by processing from blob URLs
- Audio segments are generated based on funding progression thresholds (e.g., 10%, 25%, 50%, 75%, 100%)
- Each segment corresponds to a portion of the audio duration that unlocks at specific funding levels
- Stores audio segment metadata (segment paths, duration, unlock thresholds) within the work record in the canister
- Audio segments are stored in Caffeine Blob Storage using randomly hashed filenames to prevent direct access
- **Backend validates caller's funding progress within the work's specific configured time window before returning signed URLs for audio segments to ensure secure progressive streaming access**
- Backend serves signed blob URLs for audio segments that expire after a certain time to prevent unauthorized sharing
- **Backend processes audio files from blob URLs received through decoupled upload workflow**

### Audio Work Progressive Streaming Unlock
- **For audio works: Displays audio player with progressive streaming unlock based on funding progress within the work's specific time window**
- **Audio player only allows playback of unlocked segments corresponding to current funding percentage within the work's specific time window**
- **When funding within the work's specific time window reaches specific thresholds (10%, 25%, 50%, 75%, 100%), corresponding audio segments become available for streaming**
- **Audio player interface shows visual progress indicators displaying which portions of the audio are currently unlocked based on funding within the work's specific time window**
- **Dynamic audio unlock expansion**: As funding increases within the work's specific time window, additional audio segments become available for streaming
- **Dynamic audio re-locking**: When funding within the work's specific time window falls below certain thresholds, corresponding audio segments become locked again
- **Frontend audio player integrates with existing progressive unlock system using funding calculations within the work's specific time window**
- **Audio player displays current unlock progress and total audio duration with visual indicators**
- Audio streaming uses secure, time-limited URLs for each unlocked segment to prevent unauthorized access
- All audio player interface elements, progress indicators, and unlock messages support bilingual display

### Audio Work MIME Type Recognition
- **Frontend recognizes works with `mimeType` containing `audio/mpeg` or `audio/wav` as audio type works**
- **Audio type recognition triggers the progressive streaming unlock system automatically**
- **Backend stores MIME type information for uploaded audio files to enable proper frontend recognition**
- **Audio type detection works consistently across all components (ProductList, ProductCard, ProductDetailModal, ArticleDetailPage)**

### Audio Work Display in Listings and Details
- **ProductCard.tsx displays inline audio player for audio works based on current funding progress**
- **ProductDetailModal.tsx displays adaptive audio player component for audio works with progressive streaming functionality instead of treating them as file downloads**
- **ArticleDetailPage.tsx displays adaptive audio player component for audio works with progressive streaming functionality instead of treating them as file downloads**
- **Audio works appear correctly in all work listings with proper sorting and filtering**
- **Audio player controls include bilingual labels and tooltips using existing i18n.ts**
- **Audio player shows visual indicators of unlocked segments and funding progress**
- **Audio works display appropriate metadata including duration, file format, and unlock status**
- **Adaptive audio player component unlocks portions of audio according to funding percentage within the work's specific time window**
- **Unplayed locked sections are restricted and UI displays current unlock progress**

### Character-Based Random Unlock System for Text Works
- Text work publishing page includes a toggle for "随机解锁" (random unlock) that creators can enable or disable
- When random unlock is enabled, backend stores this setting as a boolean field in the work record
- **Character-based random unlock state management**: Backend maintains random unlock state records for each viewer-work combination, storing the exact unlocked string content and associated funding percentage when state was generated
- **Time-window-aware character unlock**: Random unlock system integrates with each work's specific time window configuration, recalculating unlocked characters when funding within that work's time window changes
- **Character-based content masking**: Backend generates masked content by replacing unrevealed characters with black block symbols (█) while preserving original rich text HTML formatting and embedded images
- **Initial character-based unlock generation**: When a user first views a randomly unlockable work, backend calculates target character count based on current funding ratio within that work's specific time window and randomly selects characters from the paid content to reveal
- **Progressive character unlocking with content preservation**: On funding updates within the work's specific time window, backend recalculates target character count and randomly selects additional characters from the remaining locked portion to reveal while preserving previously unlocked characters
- **Dynamic re-locking for random unlock**: When funding within the work's specific time window falls below target, backend regenerates character unlock state with fewer revealed characters
- **Viewer-specific unlock persistence**: Backend stores unlock state per viewer (using Principal ID) to ensure consistency across sessions and prevent re-randomization on refresh
- **Dynamic character unlock expansion**: As funding increases within the work's specific time window, backend intelligently selects new random characters from still-locked portions and combines them with existing unlocked characters
- Frontend displays "随机解锁模式" indicator on work cards and article detail pages when random unlock is enabled
- **Real-time character unlock visualization**: Frontend shows visual progress indicators displaying how many characters have been progressively and randomly unlocked
- **Seamless character content updates**: Frontend dynamically refreshes unlocked character portions without page reload when new donations trigger additional character unlocking or when re-locking occurs
- **Consistent character rendering**: Frontend ensures unlocked characters remain consistent between sessions by retrieving persisted character-based unlock state from backend
- **Masked content display**: Frontend renders content with unrevealed characters replaced by black block symbols (█) while maintaining HTML formatting and embedded images
- All random unlock related interface elements and messages support bilingual display

### Rich Text Editor for Text Works
- Integrates full-featured WYSIWYG rich text editor for text-type works in creation and editing modals
- Editor supports formatting options: bold, italic, headings, hyperlinks, and image insertion
- Replaces plain text input fields for both free content and paid content sections
- Image upload functionality within the editor:
  - Users can upload images directly through the editor interface
  - Uploaded images are stored securely using existing Blob Storage logic with random hash filenames
  - Backend returns secure URLs for embedded images that are inserted into rich text content
  - Embedded image URLs are included in the rich text HTML content stored in the backend
- Rich text content with embedded images is fully rendered on article detail pages
- Editor provides consistent formatting and functionality across mobile and desktop devices
- Maintains accessibility standards and provides preview rendering capabilities
- Auto-saving functionality to prevent content loss during editing
- All editor interface elements, tooltips, and messages support bilingual display

### Work Editing and Deletion Restrictions
- **Works can only be edited or deleted when their cumulative received amount within their specific configured time window equals 0**
- **Backend validates cumulative received amount within each work's specific time window before allowing `updateWork` or `deleteWork` operations**
- **Backend queries ICP index canister using the work's account ID to check total received amount within that work's specific timeframe**
- **If cumulative received amount within the work's specific time window > 0, backend returns authorization error: "当前作品在指定时间窗口内已有转入金额，不可修改或删除." / "Current work has received funding within the specified time window and cannot be modified or deleted."**
- **Frontend disables or hides Edit/Delete buttons when cumulative received amount within the work's specific time window > 0**
- **Frontend displays tooltip or note: "当作品在指定时间窗口内已有转入金额时，无法修改或删除。" / "Cannot modify or delete when work has received funding within the specified time window."**
- **Validation is performed dynamically based on up-to-date ICP transaction data within each work's specific time window**
- All restriction messages and tooltips support bilingual display

### Work Editing Interface
- EditProductModal component provides adaptive editing behavior based on current work type:
  - For **text works**: Shows rich text editor fields for free and paid content with progressive unlock toggle and random unlock toggle, replacing plain text inputs
  - For **image works**: Displays uploaded image preview with resolution levels and allows replacing or reuploading the image through secure Blob Storage integration, without text content fields
  - For **file works**: Displays file metadata and replace option, showing download URL at 100% funding but no progressive content fields
  - For **audio works**: Displays audio metadata and replace option using decoupled upload workflow with blobStorage.upload(), shows audio player with progressive streaming unlock based on funding progress, without text content fields
- Form validation and submission logic correctly sends rich text HTML content, random unlock setting, `imageVersions`, `fileVersion`, or audio file URLs and metadata based on work type
- Interface clearly shows the current work type (text/image/file/audio) and disables irrelevant fields
- Edit modal auto-fills rich text editor with existing HTML content for text works and submits updates to backend while maintaining type integrity
- Backend supports updating works with rich text HTML content, random unlock setting, and type-specific data structures for images, files, and audio URLs
- **Time window configuration is read-only during editing** - displays current time window setting but does not allow modification
- **Edit functionality is disabled when work has received payments within its specific configured time window (cumulative amount > 0)**
- **Audio work editing uses decoupled upload workflow with blobStorage.upload() first, then canister metadata update with URLs only**
- All editing interface elements, labels, and validation messages support bilingual display

### File Processing and Storage
- When users upload files for file-type works, backend stores the file in Caffeine Blob Storage using randomly hashed filenames to prevent direct access and URL guessing
- Stores file metadata (hash path, original filename, file type) within the work record in the canister
- **Backend validates caller's funding progress within the work's specific configured time window before returning signed URLs for file downloads to ensure secure access control**
- Backend serves signed blob URLs that expire after a certain time to prevent unauthorized sharing
- **File download is only available when funding progress within the work's specific time window reaches 100%**

### Image Processing and Storage
- When users upload original images for image-type works, backend automatically generates multiple resolution versions (10%, 40%, 70%, 100%)
- Uses backend image processing utilities to create preprocessed versions with different clarity and quality levels
- Saves each generated image version in Caffeine Blob Storage using randomly hashed filenames to prevent direct access and URL guessing
- Stores image version metadata (hash path, resolution level, quality threshold) within the work record in the canister
- **Backend validates caller's funding progress within the work's specific configured time window before returning signed URLs for higher-resolution images to ensure secure progressive unlock**
- Backend serves signed blob URLs that expire after a certain time to prevent unauthorized sharing
- For rich text editor image uploads: backend stores uploaded images in Blob Storage and returns secure URLs for embedding in rich text content

### Progressive Content Display with Time-Window-Aware Unlock
- **For text works: Immediately displays free rich text content with full HTML rendering, displays paid rich text content portions based on funding achievement percentage within the work's specific configured time window**
  - **If random unlock is disabled: Reveals paid content proportionally by character length sequentially based on funding within the work's specific time window**
  - **If random unlock is enabled: Retrieves persisted character-based random unlock state from backend calculated based on funding within the work's specific time window and displays content with unrevealed characters replaced by black block symbols (█) while maintaining HTML formatting and embedded images**
- **For image works: Displays progressively clearer image versions based on funding progress within the work's specific time window (10% funding shows 10% resolution, 40% shows 40% resolution, etc.)**
- **For file works: Shows target amount and progress bar without revealing file download link until 100% funding within the work's specific time window is reached**
- **For audio works: Displays adaptive audio player with progressive streaming unlock, allowing playback of audio segments corresponding to current funding percentage within the work's specific time window**
- **Queries cumulative received amount for specified account ID within the work's specific configured time window through ICP mainnet index canister**
- **When full target amount within the work's specific time window is reached, displays complete content (full rich text with embedded images, highest resolution image, file download button, or complete audio streaming)**
- **Dynamic re-locking**: When funding within the work's specific time window falls below target amount, content automatically locks again
- **Frontend dynamically requests appropriate image version URLs or audio segment URLs from backend based on current funding percentage within the work's specific time window**
- Rich text content rendering preserves all formatting, embedded images, and hyperlinks
- **Enhanced time-window-aware unlock indicators**: Displays each work's specific time window configuration and current auto-lock status with visual progress showing funding within the specified timeframe
- **Persistent character unlock state**: Frontend retrieves and maintains viewer-specific character-based unlock state calculated based on funding within the work's specific time window to ensure consistent content display across sessions
- **Progressive character unlock expansion**: Frontend automatically updates displayed content when backend reveals new random characters due to increased funding within the work's specific time window or re-locks when funding decreases
- **Real-time character unlock feedback**: Frontend provides immediate visual feedback when new character portions become available through progressive random unlocking or when content re-locks due to funding changes within the work's specific time window
- **Masked content rendering**: Frontend displays content with unrevealed characters shown as black block symbols (█) while preserving HTML structure and embedded images
- **Audio streaming progress**: Frontend audio player shows visual indicators of which audio segments are currently unlocked and available for streaming based on funding within the work's specific time window
- All progress indicators, unlock messages, time window displays, audio player controls, and status displays support bilingual text

### Audio Work Interface
- Provides audio file upload component in work creation and editing forms for audio-type works using decoupled upload workflow with blobStorage.upload()
- Supports validation for audio file types (MP3, WAV)
- **Displays adaptive audio player interface with progressive streaming unlock functionality instead of treating audio works as file downloads**
- **Shows audio player with unlocked segments available for streaming based on funding progress within the work's specific configured time window**
- **Before reaching funding thresholds within the work's specific time window, displays target amount and progress bar with limited audio access**
- **Audio player shows visual progress indicators displaying which portions of the audio are currently unlocked**
- **Displays current time window configuration and auto-lock status**
- Audio player includes standard controls (play/pause, seek, volume) but restricts playback to unlocked segments only
- **Audio upload uses decoupled workflow: blobStorage.upload() first, then canister metadata processing with URLs only**
- All audio interface elements, player controls, and messages support bilingual display

### File Work Interface
- Provides file upload component in work creation and editing forms for file-type works
- Supports basic validation for common file types (PDF, ZIP, EXE, DOCX, etc.)
- Displays friendly UI labels for file upload and download functionality
- **Shows download button only when funding progress within the work's specific configured time window reaches 100%**
- **Before 100% funding within the work's specific time window, displays target amount and progress bar without file access**
- **Displays current time window configuration and auto-lock status**
- All file interface elements and messages support bilingual display

### Image Work Interface
- Replaces placeholder "图片作品功能即将推出" notice with fully functional image upload interface
- Provides image upload component in work creation form for image-type works
- **Displays progress visualization showing which image quality level is currently unlocked based on funding within the work's specific time window**
- **Integrates image display logic with existing progressive unlock system using funding calculations within the work's specific time window**
- **Shows appropriate image version in both work detail pages and work list cards based on funding progress within the work's specific time window**
- **Implements secure image serving through backend-validated URLs with funding verification within the work's specific time window**
- **Displays current time window configuration and auto-lock status**
- All image interface elements and progress messages support bilingual display

### ICP Mainnet Integration
- Integrates ICP mainnet index canister (`qhbym-qaaaa-aaaaa-aaafq-cai`) for real-time transaction queries
- Creates `useAccountReceivedAmount` React hook that accepts principal, accountId, and timeWindow parameters
- Hook calls `get_account_transactions` interface to get transaction records
- **Time-window filtering**: Filters transactions based on each work's specific time window setting (last 1 hour, 24 hours, 7 days, 30 days, or permanent)
- **Iterates through filtered transactions where `operation.Transfer.to` equals specified account ID within the work's specific time window**
- **Accumulates `amount.e8s` bigint values from these time-filtered transactions to calculate total received amount within the work's specific time window**
- **Returns cumulative total as bigint, recalculated every 30 seconds through React Query with awareness of each work's specific time window**
- Safely formats bigint values for display (e.g., ICP = (amount / 1e8).toFixed(4))
- Compatible with Candid optional types and mainnet transaction variants
- Fixes ICP index canister decoding errors, ensuring `created_at_time` and `icrc1_memo` fields properly handle `null` values and optional record types
- Updates Candid IDL definitions to support `IDL.Null` or `IDL.Opt(...)` types for these fields
- Gracefully handles `null` values in transaction data processing, normalizing them to empty arrays for compatibility

### Homepage and Work List
- Homepage directly displays paid work list (works with target amount > 0), sorted by publication date from newest to oldest
- Both authenticated and guest users can see the same paid work list on homepage
- Navigation bar includes "About" link pointing to new about page
- Excludes deleted/hidden works from public listings (visible only to original creator and admin)
- **Work list cards display appropriate content based on work type and funding progress within each work's specific configured time window**
- **Each work card clearly displays the author's name (including "Anonymous User" / "匿名用户" for anonymous works) alongside or below the title in a visible section**
- Work cards show "随机解锁模式" indicator when random unlock is enabled for text works
- Work cards show audio streaming progress indicators for audio works
- **Work cards display each work's specific time window configuration and current auto-lock status**
- **For text-type works in list view**: ProductList and ProductCard components display the complete free section of the text work with proper HTML rendering and embedded images visible, ensuring safe HTML rendering and appropriate CSS styles similar to article detail page, while preventing loading of locked (paid) content and maintaining responsiveness for both desktop and mobile layouts
- **For audio-type works in list view**: ProductList and ProductCard components display audio player preview with visual indicators showing unlocked segments based on current funding progress
- **Work list displays only valid works that pass backend data validation, with accurate work counts reflecting filtered results**
- **Work list uses lightweight summary data from `getAllPaidWorks` for optimal performance and payload management**
- All homepage and work list interface elements support bilingual display

### About Page
- New independent "About" page containing introductory content about the application
- Accessible through "About" link in navigation bar
- Page content introduces JiDian吉店's features and usage methods
- All about page content supports bilingual display

### Work Detail Page
- Work detail page displays:
  - **Work title, author display name (including "Anonymous User" / "匿名用户" for anonymous works), formatted publication time**
  - **Account ID, target amount, progress bar reflecting current donations within the work's specific configured time window**
  - **Time window configuration display** (e.g., "Funding Window: Last 24 hours" / "资金窗口：最近24小时")
  - **Auto-lock status indicator** showing whether content is currently locked/unlocked based on funding within the work's specific time window
  - "随机解锁模式" indicator when random unlock is enabled for text works
  - **Enhanced character unlock progress visualization**: Shows percentage of characters unlocked through random selection with visual indicators based on funding within the work's specific time window
  - **For text works: Free portion rich text content with full HTML rendering, persistent character-based random unlock content retrieved from backend showing previously unlocked characters based on funding within the work's specific time window with unrevealed characters displayed as black block symbols (█) while maintaining HTML formatting and embedded images**
  - **For image works: Progressive image display based on funding progress within the work's specific time window with quality indicators**
  - **For file works: Download button (visible only at 100% funding within the work's specific time window) or progress display**
  - **For audio works: Adaptive audio player with progressive streaming unlock, showing unlocked segments available for playback based on funding progress within the work's specific time window**
  - **Receipt records section showing transfer history list within the work's specific configured time window**
- **Progress bar uses cumulative received amount within the work's specific time window returned by updated hook**
- **Displays dynamically updated percentage (receivedAmount within work's specific time window / targetAmount * 100)**
- **Transfer records section references same real-time transaction data filtered by the work's specific time window for consistency**
- Ensures work detail page transaction fetching and progress calculation no longer have decoding errors
- **Mobile responsive design**: Uses CSS Grid/Flexbox and media queries to ensure full responsiveness on mobile devices
- **Mobile layout optimization**: Adjusts layout and styles to ensure text, progress bars, images, files, audio players, time window displays, and other UI elements fully adapt to mobile device screens without horizontal scrolling
- **Mobile compatibility**: Ensures buttons, text blocks, images, file downloads, audio players, progress bars, and time window indicators scale gracefully on small screen devices, compatible with major mobile browsers
- **Edit and delete buttons are disabled when work has received payments within its specific configured time window, with appropriate user feedback**
- Rich text content rendering maintains consistent formatting across mobile and desktop
- **Persistent character-based random unlock rendering**: Frontend retrieves viewer-specific character unlock state from backend calculated based on funding within the work's specific time window and renders consistent unlocked content with masked characters across page refreshes and sessions
- **Dynamic character unlock updates**: Frontend automatically updates displayed content when backend detects funding changes within the work's specific time window and unlocks additional random characters or re-locks content
- **Audio player responsive design**: Audio player interface adapts to mobile and desktop layouts while maintaining full functionality
- **Work detail page loads full work data using `getWork` or `getWorkDetailsWithTimeWindow` functions for complete content access**
- All work detail page elements, labels, buttons, time window displays, audio player controls, and messages support bilingual display

### Article Detail Page Routing
- Implements dedicated article detail page routing (e.g., `/article/:id`)
- **Page displays complete work content (rich text with embedded images, image, file, or adaptive audio player), author name (including "Anonymous User" / "匿名用户" for anonymous works), formatted publication time, funding progress within the work's specific time window, time window configuration, auto-lock status, and transaction list**
- **For audio works: Displays adaptive audio player component with progressive streaming functionality instead of treating them as file downloads**
- If directly accessing article page but container is not initialized, automatically redirects to homepage and adds query parameter `?p=ID`
- On app startup, ensures after container access control initialization completes, if URL contains `?p=ID` parameter, automatically navigates to corresponding article detail page
- **Article detail page loads full work data using `getWork` or `getWorkDetailsWithTimeWindow` functions for complete content access**
- All article detail page interface elements support bilingual display

### SPA Fallback Routing and Deep Link Handling
- Implements SPA fallback routing so all non-static, non-file URLs (e.g., /article/:workId, /work/:id, any deep link path) always serve frontend index.html
- Ensures app loads environment variables and backend canister IDs before rendering
- Adds unified deep-link redirect mechanism: on initial load, detects if current path matches dynamic route (such as /article/:id)
- If dynamic route detected, extracts dynamic identifier and immediately normalizes URL to "/?article=:id" using history.replaceState without full reload
- After application bootstrap and canister initialization completes, detects query parameter (?article=:id) and programmatically navigates to corresponding article detail view using client-side routing
- Guarantees data availability before rendering, preventing "Work not found", missing canister ID, or uninitialized actor errors on direct access
- Applies consistently to all dynamic routes (current and future)
- Includes clear initialization and redirect logging compatible with existing eruda/mobile console to trace: initial URL → normalization → canister ready → final navigation

### Receipt Records Feature
- **Connects directly to ICP mainnet index canister (`qhbym-qaaaa-aaaaa-aaafq-cai`) for real-time transaction queries**
- **Frontend `useTransactions` hook queries mainnet index canister directly, not backend mock data**
- **Backend `getFilteredTransferRecords` function is disabled or removed to prevent mock data generation**
- **Time-window filtering**: Only displays transfer records that fall within each work's specific configured time window
- **Accurate timestamp formatting**: Uses `created_at_time.timestamp_nanos / 1_000_000` for proper `Date` conversion
- **Correct amount conversion**: Divides `e8s` values by `1e8` to display accurate ICP amounts
- Transfer records include transaction ID, sender address, amount, and timestamp
- **Frontend displays "Receipt Records" section on work detail page, listing each transfer's sender (or short address), amount, and date in chronological order within the work's specific time window**
- **Provides manual refresh button to re-query transfer records within the work's specific time window**
- Transfer record queries do not require authentication as this is public information related to specific account ID
- **Displays time window context for receipt records (e.g., "Receipts (Last 24 hours)" / "收据记录（最近24小时）") based on each work's specific time window setting**
- All receipt records interface elements and labels support bilingual display

### Progress Updates
- **Supports manual refresh or automatic refresh every 30 seconds, updating current fundraising percentage within each work's specific time window and visible paid content portion (rich text with embedded images, image, file access, or audio streaming)**
- **Transfer records also auto-refresh every 30 seconds, synchronized with donation progress updates within each work's specific time window**
- **Time-window-aware progress updates**: Backend continuously evaluates funding within each work's specific configured time window and triggers content locking/unlocking accordingly
- **Enhanced character-based random unlock updates**: When funding within a work's specific time window increases, backend automatically recalculates and unlocks additional random characters from remaining locked content; when funding decreases below target, backend re-locks content and regenerates character unlock state
- **Real-time character unlock synchronization**: Frontend implements reactive triggers to immediately fetch updated character-based random unlock state when funding balance within a work's specific time window changes, ensuring newly unlocked characters appear or content re-locks without waiting for polling intervals
- **Dynamic re-locking notifications**: Frontend provides immediate visual feedback when content re-locks due to funding within the work's specific time window falling below target
- **Audio streaming updates**: When funding within a work's specific time window changes, audio player automatically updates available segments for streaming and provides visual feedback for newly unlocked or re-locked audio portions
- All progress update notifications, time window status changes, audio unlock notifications, and messages support bilingual display

### Mobile Debug Console
- Integrates **eruda** mobile debug console with admin-only visibility control
- Eruda initialization in `frontend/index.html` checks admin privilege via `localStorage` flag set after successful `isCallerAdmin` query
- If `isAdmin` localStorage flag is false or not present, Eruda script is not loaded and corner icon remains hidden
- If `isAdmin` localStorage flag is true, dynamically loads Eruda and positions corner icon at bottom right
- Visiting users and guests will not see the Eruda debug icon on mobile devices
- Configures eruda floating entry button (badge) fixed at screen **bottom right corner**, always displayed above other UI layers for admin users only
- Adds detailed `console.log` output for deep link flow:
  - App startup
  - Environment/canister ID initialization
  - URL parsing (path + query parameters)
  - Deep link parameter detection (article/work ID)
  - Redirect to homepage
  - Navigation to target article/work after initialization
  - Error cases (work not found, data loading failed)
- Ensures eruda logs persist during redirects and SPA route changes
- Guest users never see admin UI or admin-only console logs

### SEO Optimization
- Implements complete SEO metadata including:
  - Page title: `<title>JiDian吉店 - Drop by drop funding, step by step unlocking</title>`
  - Meta description: `<meta name="description" content="JiDian吉店 - Drop by drop funding, step by step unlocking. Publish text works with progressive content unlocking functionality.">`
  - Keywords: `<meta name="keywords" content="JiDian吉店,text works,progressive unlock,ICP,blockchain,funding">`
  - Open Graph metadata:
    - `<meta property="og:title" content="JiDian吉店 - Drop by drop funding, step by step unlocking">`
    - `<meta property="og:description" content="Publish text works with progressive content unlocking functionality.">`
    - `<meta property="og:type" content="website">`
    - `<meta property="og:site_name" content="JiDian吉店">`
- About page maintains same SEO optimization standards
- Article detail pages dynamically generate SEO metadata based on work title and author:
  - Page title: `<title>[Work Title] - [Author Name] | JiDian吉店</title>`
  - Meta description: Generated based on work content and author information
  - Open Graph tags: Include work title, author, and description information

### Critical Backend Data Persistence Bug Fix
- **Backend must implement robust data persistence validation to prevent works Map or AccessControl state from being reset during audio work creation failures**
- **Backend createWork function must use atomic operations or proper error handling to ensure partial failures do not corrupt the global works collection**
- **Backend must implement rollback mechanisms: when audio work creation fails, only the failed work should be discarded without affecting existing works**
- **Backend must validate that all work types (text, image, file, audio) are properly stored and retrievable after any creation or update operation**
- **Backend must implement automated state recovery mechanisms to restore current works if partial failures occur during audio processing**
- **Backend must ensure that audio work processing failures do not trigger Map reinitialization or AccessControl state corruption**
- **Backend must implement proper error isolation: audio processing errors should not propagate to affect the global application state**
- **Backend must validate data integrity after each work creation operation to ensure the works collection remains intact**
- **Backend must implement transaction-like behavior for work creation: either the entire operation succeeds or it fails without side effects**
- **Backend must provide diagnostic logging to identify when and why the works Map gets reset or corrupted**
- **Backend must implement state consistency checks to detect and prevent data corruption during audio work operations**
- **Backend must ensure that failed audio work uploads do not leave the application in an inconsistent state where existing works become inaccessible**

## Data Storage
Backend stores:
- User Principal addresses and user profile information (display names)
- **Global application settings including anonymous posting permission (default: enabled) and Google Analytics configuration (tracking ID and enabled status, default: disabled)**
- **Work metadata (title, work type, free rich text content with embedded images, paid rich text content with embedded images, target amount, receiving account ID, funding time window configuration, progressive unlock settings, random unlock setting for text works, progressive streaming unlock setting for audio works, author display name, creator Principal ID, publication timestamp, deleted/hidden flag, MIME type information for uploaded files)**
- **Time-window-aware character-based random unlock state records**: Viewer-specific unlock state data including the exact unlocked string content, associated funding percentage when generated within each work's specific time window, viewer Principal ID, and time window context for each work with random unlock enabled
- For image works: Image version metadata including hash paths, resolution levels, and quality thresholds for each generated version (10%, 40%, 70%, 100%)
- For file works: File metadata including hash path, original filename, file type, and MIME type
- For audio works: **Audio file URLs and metadata only (not binary data)**, audio segment metadata including hash paths for .m3u8 playlist and .ts segment files, segment durations, unlock thresholds for progressive streaming, and MIME type information
- For rich text editor uploads: Image metadata including hash paths and secure URLs for images embedded in rich text content
- Backend needs to support querying works filtered by target amount and deletion status, with results sorted by publication date from newest to oldest
- **Backend `createWork` function automatically sets author display name (authenticated user's name or "Anonymous User" / "匿名用户"), creator Principal ID, publication timestamp, MIME type information, and stores selected time window configuration when creating works**
- **Backend `createWork` function validates anonymous posting permission before allowing anonymous users to create works**
- **Backend `createWork` function processes audio files from blob URLs received through decoupled upload workflow, accepting only URLs and metadata, never binary audio data**
- **Backend `updateWork` function keeps publication timestamp and time window configuration unchanged, only updates modifiable fields and handles type-specific data (rich text HTML content, random unlock setting, imageVersions, fileVersion, audio URLs and metadata) based on work type**
- **Backend `updateWork` function processes audio file updates from blob URLs when audio works are edited, accepting only URLs and metadata**
- **Backend `updateWork` and `deleteWork` functions validate cumulative received amount within each work's specific configured time window equals 0 before proceeding**
- Backend implements soft delete functionality - adds deleted/hidden flag to works instead of permanent removal
- Backend access rules ensure first initialized principal is admin (reuses existing AccessControl)
- Backend query logic excludes deleted works from public listings but allows access by original creator and admin
- **Backend validates caller's funding progress within each work's specific configured time window before returning signed URLs for higher-resolution images, file downloads, and audio segments**
- **Backend stores mapping between funding percentage thresholds within each work's specific time windows and corresponding content access levels**
- Backend WorkType includes four variants: text (with rich text HTML content and random unlock setting), image, file, and audio (with streaming segments and progressive unlock setting, storing URLs and metadata only)
- Backend provides image upload endpoint for rich text editor that stores images in Blob Storage and returns secure URLs
- **Time-window-aware funding calculation**: Backend provides functions to calculate cumulative funding within each work's specific time window settings and evaluate lock/unlock status accordingly
- **Dynamic re-locking logic**: Backend implements automatic content locking when funding within each work's specific time window falls below target amount
- **Time-window-aware character-based random unlock state management**: Backend provides functions to generate, retrieve, and update viewer-specific character-based random unlock states based on funding within each work's specific configured time window, storing the exact unlocked string content and ensuring persistence across sessions with progressive expansion as funding increases or contraction when funding decreases
- **Backend provides `getSettings` and `updateSettings` endpoints for admin to manage global application settings including anonymous posting permission and Google Analytics configuration**
- **Backend provides `getAnalyticsSettings` and `updateAnalyticsSettings` endpoints specifically for admin to manage Google Analytics tracking ID and enabled status**
- **Audio processing and segment management**: Backend provides functions to process uploaded audio files into HLS streaming format, generate segment metadata, and manage progressive unlock thresholds for audio streaming, working with audio file URLs from blob storage
- **Decoupled audio processing**: Backend processes audio files from blob URLs received through decoupled upload workflow, never handling binary audio data in createWork or updateWork functions
- **Critical data persistence safeguards**: Backend implements atomic operations, proper error handling, rollback mechanisms, and state validation to prevent works Map or AccessControl corruption during audio work creation failures
- **Robust work data validation**: Backend implements comprehensive validation for all work records, ensuring only complete works with valid metadata (id, title, creator, workType) are included in query results
- **Optimized payload management**: Backend `getAllPaidWorks` returns lightweight summary data (id, title, author, workType, targetAmount, publishedAt, timeWindow, randomUnlock flag, short content preview) while excluding large fields (full content, imageVersions, fileVersion, audioSegments) to keep payload under 3MB; full work data remains accessible via `getWork` and `getWorkDetailsWithTimeWindow` functions

## Technical Implementation
- **Favicon and icon implementation**: Frontend `index.html` includes proper `<link rel="icon" ...>` and `<link rel="apple-touch-icon" ...>` tags referencing provided favicon assets (`generated/jidian-favicon.dim_32x32.png`, `generated/jidian-logo-transparent.dim_200x200.png`, `generated/jidian-apple-touch-icon.dim_180x180.png`) with correct sizes and formats for browser tab display, mobile bookmarks, and iOS home screen icons
- **Direct ICP mainnet index canister integration**: Frontend `useTransactions` hook connects directly to ICP mainnet index canister (`qhbym-qaaaa-aaaaa-aaafq-cai`) for transaction queries with filtering based on each work's specific time window
- **Disabled backend mock data**: Backend `getFilteredTransferRecords` function is removed or disabled to prevent mock transaction data generation
- **Accurate timestamp conversion**: Uses `created_at_time.timestamp_nanos / 1_000_000` for proper `Date` object creation from nanosecond timestamps
- **Correct ICP amount formatting**: Divides `e8s` values by `1e8` to display accurate ICP amounts in transaction records
- **Frontend implements automatic refresh mechanism and manual refresh functionality with awareness of each work's specific time window**
- **Comprehensive bilingual language support**: Implements global language context/i18n provider with English and Chinese translation files (en.json/zh.json), language toggle in header/footer, localStorage persistence for language preference, and dynamic text display across all UI components including ArticleDetailPage, ProductDetailModal, CreateProductModal, EditProductModal, AdminDashboard, AboutPage, ProfileSetupModal, system messages, notifications, progress indicators, validation messages, tooltips, placeholders, time window configuration options, auto-lock status indicators, anonymous user labels, admin settings interface, audio player controls, audio upload interface, streaming progress indicators, Google Analytics configuration interface, and all dynamic content
- **Google Analytics dynamic script injection**: Frontend loads Google Analytics configuration on app initialization and dynamically injects GA script only when enabled by admin with valid tracking ID
- **Google Analytics automatic tracking**: Integrates with `react-router` to automatically track page views on navigation and key user events throughout the application
- **Google Analytics admin configuration**: Frontend implements Google Analytics settings interface in Admin Dashboard with tracking ID input field, enable/disable toggle, validation, and bilingual labels
- **Google Analytics backend integration**: Backend provides secure endpoints for admin-only Google Analytics configuration management with proper validation and persistence
- **Fixes Candid type definitions and data processing to ensure full compatibility with mainnet ICP index canister with filtering based on each work's specific time window**
- Maintains existing responsive design and style consistency
- **Mobile responsive optimization**: Uses responsive design techniques (CSS Grid/Flexbox + media queries) to ensure all UI elements including time window displays, auto-lock indicators, audio players, and Google Analytics configuration interface fully adapt on mobile devices without horizontal scrolling
- Implements routing logic handling container initialization and article page navigation
- **Mobile debug support**: Integrates eruda debug console with admin-only visibility control, checking localStorage `isAdmin` flag before initialization
- **SPA routing and deep link handling**: Implements fallback routing and unified deep link mechanism to ensure proper initialization and navigation for all dynamic routes
- **Admin access control**: Ensures guest users never see admin UI elements or admin-specific functionality including debug console and Google Analytics configuration
- **Image processing**: Implements backend image processing utilities for generating multiple resolution versions (10%, 40%, 70%, 100%) with secure storage in Caffeine Blob Storage
- **File processing**: Implements backend file storage utilities for secure file storage in Caffeine Blob Storage with random hash filenames
- **Audio processing**: Implements backend audio processing utilities for converting uploaded audio files (MP3, WAV) into HLS streaming format with .m3u8 playlist and .ts segment files, generating segments based on funding progression thresholds, working with audio file URLs from blob storage
- **Fully decoupled audio upload workflow**: Frontend uploads audio files using blobStorage.upload() completely independently from createWork canister calls, sending only URLs and metadata to backend
- **Audio upload process decoupling**: CreateProductModal and EditProductModal implement fully decoupled audio upload (blobStorage.upload() → URL retrieval → canister metadata submission) with progress indicators for both stages and comprehensive error handling
- **Request payload optimization**: Audio work creation sends only text metadata and URLs to createWork, ensuring payload size remains under 2MB by excluding all binary data
- **Rich text editor integration**: Implements WYSIWYG rich text editor with image upload functionality, secure Blob Storage integration, and consistent rendering across devices
- **Rich text image handling**: Backend provides dedicated endpoint for rich text editor image uploads, storing images securely and returning URLs for embedding
- **Time-window-aware secure progressive unlock**: Backend validates funding progress within each work's specific configured time window before serving signed, time-limited URLs for higher-resolution images, file downloads, and audio segments to prevent unauthorized access and URL guessing
- **File work interface**: Provides file upload interface with validation, progress display based on funding within each work's specific time window, and conditional download access based on funding completion within that work's specific time window
- **Image work interface**: Replaces placeholder notices with fully functional upload interface, progress visualization based on funding within each work's specific time window, and integrated display logic
- **Audio work interface**: Provides audio file upload interface with decoupled upload workflow using blobStorage.upload(), validation for MP3 and WAV formats, audio player with progressive streaming unlock functionality, visual progress indicators showing unlocked segments, and responsive design for mobile and desktop
- **Audio work creation interface**: CreateProductModal includes "Audio" tab with decoupled upload workflow using blobStorage.upload() supporting .mp3 and .wav formats, validation rules, blob storage integration, progressive streaming unlock toggle, and bilingual labels using existing i18n.ts
- **Audio work display**: ProductCard.tsx and ProductDetailModal.tsx display inline audio player for audio works with progressive streaming based on current funding progress, bilingual controls, and proper sorting/filtering in listings
- **Audio work detail display**: ArticleDetailPage.tsx displays adaptive audio player component for audio works with progressive streaming functionality instead of treating them as file downloads
- **Audio MIME type recognition**: Frontend recognizes works with `mimeType` containing `audio/mpeg` or `audio/wav` as audio type works and triggers progressive streaming unlock system automatically
- **Adaptive audio player component**: Frontend implements adaptive audio player that unlocks portions of audio according to funding percentage within work's specific time window, restricts unplayed locked sections, and displays current unlock progress with bilingual interface support
- **Adaptive editing interface**: EditProductModal component adapts form fields, validation, and submission logic based on work type, ensuring proper handling of rich text content, random unlock setting, image versions, file metadata, and audio URLs and metadata with decoupled upload workflow, with read-only display of time window configuration
- **Time-window-aware edit/delete restrictions**: Backend validates cumulative received amount within each work's specific configured time window through ICP index canister before allowing modifications, frontend disables controls and shows appropriate feedback when works have received payments within their specific time window
- **Rich text rendering**: Frontend implements HTML rendering for rich text content with embedded images, maintaining formatting consistency across mobile and desktop
- **Time-window-aware character-based random unlock system**: Backend implements persistent character-based random unlock state management with viewer-specific tracking based on funding within each work's specific configured time windows, storing exact unlocked string content and progressive character expansion as funding increases or contraction when funding decreases within each work's specific time window
- **Time-window-aware character unlock state persistence**: Backend stores and manages viewer-specific character unlock states using Principal ID mapping with each work's specific time window context, ensuring consistent content display and preventing re-randomization
- **Progressive random character expansion with re-locking**: Backend intelligently selects additional random characters from remaining locked content when funding within each work's specific time window increases, preserves previously unlocked characters, and regenerates unlock state with fewer characters when funding decreases below target
- **Real-time time-window-aware character unlock state synchronization**: Frontend implements reactive state management to immediately retrieve updated character-based random unlock states when funding within each work's specific time window changes, ensuring seamless content updates or re-locking without page reload
- **Character masking and rendering**: Frontend displays content with unrevealed characters replaced by black block symbols (█) while preserving HTML formatting and embedded images
- **Audio streaming implementation**: Frontend implements HTML5 audio player with HLS.js or similar streaming library for progressive audio unlock, supporting secure segment loading based on funding progress within each work's specific time window
- **Audio player controls**: Frontend audio player includes standard controls (play/pause, seek, volume) but restricts playback to unlocked segments only, with visual indicators showing which portions are available
- **Audio segment security**: Backend serves signed, time-limited URLs for audio segments based on funding validation within each work's specific time window, preventing unauthorized access to locked audio content
- **Auto-saving**: Rich text editor includes auto-saving functionality to prevent content loss during editing sessions
- **Work list sorting**: All work lists (homepage, ProductList component, admin dashboard) sort works by publication date from newest to oldest
- **Author display**: All work cards and list entries prominently display the author's name (including "Anonymous User" / "匿名用户" for anonymous works) alongside the title in a clearly visible section
- **Rich text list display**: ProductList and ProductCard components render complete free section HTML content with embedded images for text-type works, using safe HTML rendering and appropriate CSS styles while maintaining mobile/desktop responsiveness
- **Audio list display**: ProductList and ProductCard components display audio player preview with visual indicators showing unlocked segments for audio-type works
- **Enhanced time-window-aware character-based random unlock indicators**: Work cards and article detail pages display "随机解锁模式" indicator with visual progress showing percentage of characters unlocked through random selection based on funding within each work's specific time window, plus time window configuration and auto-lock status
- **Audio streaming indicators**: Work cards and article detail pages display audio streaming progress indicators showing which segments are unlocked based on funding within each work's specific time window
- **Persistent time-window-aware character unlock state retrieval**: Frontend retrieves viewer-specific character-based unlock state from backend calculated based on funding within each work's specific configured time window to ensure consistent content display across sessions and prevent re-randomization on refresh
- **Dynamic character unlock expansion with re-locking visualization**: Frontend provides immediate visual feedback when new character portions become available through progressive random unlocking based on funding increases within each work's specific time window, or when content re-locks due to funding decreases, with seamless content updates
- **Dynamic audio unlock visualization**: Frontend provides immediate visual feedback when new audio segments become available or when segments re-lock due to funding changes within each work's specific time window
- **Time-window-aware character-based content masking**: Backend generates masked content by replacing unrevealed characters with black block symbols (█) while preserving original rich text HTML formatting and embedded images, calculated based on funding within each work's specific configured time window
- **Time-window-aware character unlock content management**: Backend maintains exact unlocked string content for each viewer-work combination based on funding within each work's specific configured time window, ensuring consistent character revelation across sessions and progressive expansion as funding increases or contraction when funding decreases within each work's specific time window
- **Time window configuration management**: Backend stores immutable time window settings per work and provides functions to calculate funding amounts within each work's specific specified timeframes
- **Dynamic re-locking system**: Backend implements automatic content locking/unlocking based on real-time funding evaluation within each work's specific configured time windows
- **Time-window transaction filtering**: Frontend and backend implement transaction filtering logic to only consider payments within each work's specific specified time window for funding calculations
- **Anonymous publishing control**: Backend implements global settings management with `getSettings` and `updateSettings` endpoints, validates anonymous posting permission in `createWork` function, and automatically assigns "Anonymous User" / "匿名用户" author name for anonymous creators
- **Anonymous user display**: Frontend implements consistent display of "Anonymous User" / "匿名用户" labels across all components (ProductList, ProductCard, ProductDetailModal, ArticleDetailPage, AdminDashboard) when works are created by anonymous users
- **Admin settings interface**: Frontend implements admin dashboard toggle for anonymous posting control and Google Analytics configuration with bilingual labels, persistent settings storage, and real-time UI updates based on current setting states
- **Anonymous posting validation**: Frontend shows login prompts for anonymous users when anonymous posting is disabled, allows anonymous work creation when enabled, and provides appropriate user feedback and error messages
- **Audio file validation**: Frontend and backend implement validation for supported audio file formats (MP3, WAV) with appropriate error messages and file size limits
- **HLS streaming integration**: Backend implements HLS (HTTP Live Streaming) processing to convert uploaded audio files into .m3u8 playlist and .ts segment files for progressive streaming unlock, working with audio file URLs from blob storage
- **Audio segment management**: Backend manages audio segment metadata including duration, unlock thresholds, and secure hash paths for each segment file
- **Progressive audio unlock logic**: Backend implements funding-based audio segment unlock logic, determining which segments are available based on current funding percentage within each work's specific time window
- **Audio player responsive design**: Frontend audio player interface adapts to mobile and desktop layouts while maintaining full streaming functionality and visual progress indicators
- **Audio work modal display fix**: ProductDetailModal.tsx properly handles audio works by displaying adaptive audio player component with progressive streaming functionality instead of treating them as file downloads
- **Audio work article page display fix**: ArticleDetailPage.tsx properly handles audio works by displaying adaptive audio player component with progressive streaming functionality instead of treating them as file downloads
- **MIME type storage and recognition**: Backend stores MIME type information for uploaded audio files, frontend uses MIME type detection (`audio/mpeg` or `audio/wav`) to identify audio works and trigger progressive streaming unlock system
- **CSS styles preservation**: All modifications maintain existing CSS styles unchanged while implementing new audio functionality and Google Analytics configuration interface
- **Critical backend data persistence bug fixes**: Implements atomic operations, proper error handling, rollback mechanisms, state validation, automated recovery, error isolation, data integrity checks, transaction-like behavior, diagnostic logging, consistency checks, and state corruption prevention to ensure audio work creation failures do not reset or corrupt the works Map or AccessControl state
- **Robust work data validation and filtering**: Backend `getAllPaidWorks` function implements comprehensive validation for required metadata fields (id, title, creator, workType), automatically skips invalid or incomplete works, ensures all work types load correctly, provides error logging for debugging, and returns only valid works; Frontend handles filtered results gracefully and displays accurate work counts reflecting only valid works
- **Two-tier data loading optimization**: Frontend implements optimized data loading strategy using lightweight summary data from `getAllPaidWorks` for work lists (ProductList, ProductCard components) and full data retrieval via `getWork`/`getWorkDetailsWithTimeWindow` functions only when accessing work detail pages (ArticleDetailPage, ProductDetailModal), ensuring payload sizes remain under 3MB while maintaining all existing functionality including progressive unlock, random unlock, audio streaming, and time window features
- **Payload management**: Backend `getAllPaidWorks` excludes large fields (full content, imageVersions, fileVersion, audioSegments, embedded images) and returns only essential summary data (id, title, author, workType, targetAmount, publishedAt, timeWindow, randomUnlock flag, short content preview up to ~200 characters) to prevent 3MB payload limit issues
- **Backward compatibility**: Optimized data loading maintains full compatibility with existing text, image, file, and audio work types, ensuring all progressive unlock functionality works correctly when full data is loaded in detail views
- **Loading state management**: Frontend gracefully handles two-stage data loading with appropriate loading indicators, error handling, and user feedback for both summary data in lists and full data in detail views
- **Decoupled audio upload error handling**: Frontend provides comprehensive error handling for both blob storage upload failures and canister processing failures, with appropriate bilingual error messages and retry mechanisms
- **Audio upload progress tracking**: Frontend displays progress indicators for both blob upload stage and canister processing stage, providing clear feedback to users during the decoupled upload workflow
- **Audio file size validation**: Frontend validates audio file sizes before initiating blob upload to prevent unnecessary uploads that would exceed limits
- **Backend audio URL validation**: Backend createWork() and updateWork() functions validate that audio work submissions contain only URLs and metadata, rejecting any binary audio data
- **Frontend audio URL submission**: CreateProductModal and EditProductModal ensure only audio file URLs from blobStorage.upload() are submitted to backend, never file blobs or binary data
- **Payload size optimization**: All createWork requests contain only text metadata and URLs, ensuring request payloads remain under 2MB by completely excluding binary data through decoupled upload workflow
- **Google Analytics privacy compliance**: Only tracks users when explicitly enabled by admin, respects user privacy, and provides clear indication when analytics is active
- **Google Analytics configuration validation**: Frontend validates Google Analytics tracking ID format (e.g., G-XXXXXXX) before saving and provides appropriate error messages for invalid formats
- **Google Analytics script management**: Frontend dynamically loads and unloads Google Analytics scripts based on admin configuration changes without requiring page refresh
- **Fixed authentication flow implementation**: `useInternetIdentity` hook and `App.tsx` implement proper authentication state initialization with safeguards to prevent infinite refresh loops on Windows Chrome
- **Authentication state guards**: Implements proper state validation and initialization checks to ensure Internet Identity session, admin flag, and localStorage values are fully resolved before triggering navigation or re-renders
- **Reload loop prevention**: Authentication flow includes specific safeguards to prevent repeated reloads or redirects during identity state transitions, with particular attention to Windows Chrome compatibility
- **Component initialization sequence**: App.tsx ensures proper initialization order of authentication components, preventing state conflicts that could trigger infinite refresh cycles
- **Cross-browser authentication testing**: Authentication flow is specifically tested and verified across different browsers, with dedicated fixes for Windows Chrome infinite refresh issues
- **Authentication-aware initialization**: GA, language context, and Eruda initialization wait for authentication state to be fully resolved before loading to prevent triggering reload loops when user state updates
- **SPA router authentication safeguards**: Deep-link logic includes authentication status checks to skip redirection if authentication is already resolved, preventing infinite redirect loops during login flows
- **Identity state persistence**: Proper localStorage management ensures authentication status persists correctly across page reloads without triggering infinite refresh cycles, with specific handling for Windows Chrome browser behavior
