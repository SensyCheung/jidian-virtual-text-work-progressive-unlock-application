import Map "mo:core/Map";
import Time "mo:core/Time";
import List "mo:core/List";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import OutCall "http-outcalls/outcall";
import AccessControl "authorization/access-control";



actor {
  public type TextWorkId = Text;

  public type FileVersion = {
    url : Text;
    originalFilename : Text;
    mimeType : Text;
    fundingThreshold : Nat;
  };

  public type ImageVersion = {
    url : Text;
    resolutionPercentage : Nat;
    fundingThreshold : Nat;
  };

  public type WorkType = {
    #text;
    #image;
    #audio;
    #file;
  };

  public type TimeWindow = {
    #last1Hour;
    #last24Hours;
    #last7Days;
    #last30Days;
    #permanent;
  };

  public type Work = {
    id : TextWorkId;
    title : Text;
    content : Text;
    author : Text;
    publishedAt : Time.Time;
    creator : Principal;
    deleted : Bool;
    targetAmount : Nat;
    accountId : Text;
    progressiveUnlock : Bool;
    randomUnlock : Bool;
    workType : WorkType;
    fileVersion : ?FileVersion;
    imageVersions : ?[ImageVersion];
    timeWindow : TimeWindow;
  };

  public type WorkSummary = {
    id : TextWorkId;
    title : Text;
    author : Text;
    publishedAt : Time.Time;
    targetAmount : Nat;
    workType : WorkType;
    timeWindow : TimeWindow;
    randomUnlock : Bool;
    contentPreview : Text;
  };

  public type RandomUnlockState = {
    viewerPrincipal : Principal;
    workId : TextWorkId;
    unlockedString : Text;
    fundingPercentageWhenGenerated : Nat;
    lastUpdated : Time.Time;
  };

  public type UserProfile = {
    name : Text;
    principalAddress : ?Principal;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  public type TransferRecord = {
    txId : Text;
    from : Text;
    amount : Nat;
    timestamp : Int;
  };

  public type WorkDetail = {
    work : Work;
    receivedAmount : Nat;
    unlockProgress : Nat;
    unlocked : Bool;
  };

  public type AppSettings = {
    allowAnonymousPublishing : Bool;
    gaTrackingId : ?Text;
    analyticsEnabled : Bool;
  };

  var appSettings : AppSettings = {
    allowAnonymousPublishing = true;
    gaTrackingId = null;
    analyticsEnabled = false;
  };

  let works = Map.empty<TextWorkId, Work>();
  let accessControlState = AccessControl.initState();
  var userProfiles = Map.empty<Principal, UserProfile>();
  let randomUnlockStates = Map.empty<Text, RandomUnlockState>();

  let ICP_INDEX_URL = "https://icp-api.io/api?qry=4p2up-6iaaa-aaaah-abkha-cai";

  // ============================================
  // Access Control Functions
  // ============================================

  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  // ============================================
  // User Profile Functions
  // ============================================

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("未授权：只有用户可以保存个人资料");
    };
    let updatedProfile = {
      profile with
      updatedAt = Time.now();
    };
    userProfiles.add(caller, updatedProfile);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    // Any caller (including guests) can query their own profile
    // Guests will simply get null if they have no profile
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("未授权：只能查看自己的个人资料");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func setUserPrincipal(principal : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("未授权：只有用户可以设置Principal地址");
    };
    let existingProfile = userProfiles.get(caller);
    let newProfile = switch (existingProfile) {
      case (null) {
        { name = ""; principalAddress = ?principal; createdAt = Time.now(); updatedAt = Time.now() };
      };
      case (?profile) {
        { profile with principalAddress = ?principal; updatedAt = Time.now() };
      };
    };
    userProfiles.add(caller, newProfile);
  };

  public query ({ caller }) func getUserPrincipal() : async ?Principal {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("未授权：只有用户可以查询Principal地址");
    };
    switch (userProfiles.get(caller)) {
      case (null) { null };
      case (?profile) { profile.principalAddress };
    };
  };

  // ============================================
  // Helper Functions
  // ============================================

  private func canAccessWork(caller : Principal, work : Work) : Bool {
    if (not work.deleted) {
      return true;
    };
    caller == work.creator or AccessControl.isAdmin(accessControlState, caller)
  };

  private func validateWorkAccess(caller : Principal, work : Work) {
    if (not canAccessWork(caller, work)) {
      Runtime.trap("未授权：无法访问此作品");
    };
  };

  // ============================================
  // Work Management Functions
  // ============================================

  public shared ({ caller }) func createWork(
    id : TextWorkId,
    title : Text,
    content : Text,
    workType : WorkType,
    targetAmount : Nat,
    accountId : Text,
    progressiveUnlock : Bool,
    randomUnlock : Bool,
    fileVersion : ?FileVersion,
    imageVersions : ?[ImageVersion],
    timeWindow : TimeWindow,
  ) : async () {
    // Check if caller is authenticated (has user role or higher)
    let isAuthenticated = AccessControl.hasPermission(accessControlState, caller, #user);

    // If anonymous publishing is disabled, only authenticated users can create works
    if (not appSettings.allowAnonymousPublishing and not isAuthenticated) {
      Runtime.trap("未授权：匿名发布已禁用，只有登录用户可以创建作品");
    };

    // Validate work ID uniqueness
    if (works.containsKey(id)) {
      Runtime.trap("作品ID已存在");
    };

    // Determine author name based on authentication status
    let authorName = if (isAuthenticated) {
      switch (userProfiles.get(caller)) {
        case (?profile) { profile.name };
        case (null) { "" };
      };
    } else {
      "Anonymous User";
    };

    let newWork : Work = {
      id;
      title;
      content;
      author = authorName;
      workType;
      deleted = false;
      fileVersion;
      imageVersions;
      targetAmount;
      accountId;
      progressiveUnlock;
      randomUnlock;
      publishedAt = Time.now();
      creator = caller;
      timeWindow;
    };
    works.add(id, newWork);
  };

  public shared ({ caller }) func updateWork(
    id : TextWorkId,
    title : Text,
    content : Text,
    author : Text,
    workType : WorkType,
    targetAmount : Nat,
    accountId : Text,
    progressiveUnlock : Bool,
    randomUnlock : Bool,
    fileVersion : ?FileVersion,
    imageVersions : ?[ImageVersion],
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("未授权：只有用户可以更新作品");
    };

    switch (works.get(id)) {
      case (null) { Runtime.trap("作品不存在") };
      case (?work) {
        if (caller != work.creator and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("未授权：只有作品创建者或管理员可以更新作品");
        };

        if (work.deleted) {
          Runtime.trap("不能编辑已删除的作品");
        };

        let receivedAmount = await getAccountBalanceProxy(work.accountId, work.timeWindow);
        if (receivedAmount > 0) {
          Runtime.trap("当前作品在指定时间窗口内已有转入金额，不可修改或删除。");
        };

        let updatedWork : Work = {
          id;
          title;
          content;
          author;
          workType;
          targetAmount;
          accountId;
          progressiveUnlock;
          randomUnlock;
          deleted = false;
          fileVersion;
          imageVersions;
          publishedAt = work.publishedAt;
          creator = work.creator;
          timeWindow = work.timeWindow;
        };
        works.add(id, updatedWork);
      };
    };
  };

  public shared ({ caller }) func deleteWork(id : TextWorkId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("未授权：只有用户可以删除作品");
    };

    switch (works.get(id)) {
      case (null) { Runtime.trap("作品不存在") };
      case (?work) {
        if (caller != work.creator and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("未授权：只有作品创建者或管理员可以删除作品");
        };

        if (work.deleted) {
          Runtime.trap("作品已被删除");
        };

        let receivedAmount = await getAccountBalanceProxy(work.accountId, work.timeWindow);
        if (receivedAmount > 0) {
          Runtime.trap("当前作品在指定时间窗口内已有转入金额，不可修改或删除。");
        };

        let deletedWork : Work = {
          work with deleted = true
        };
        works.add(id, deletedWork);
      };
    };
  };

  public shared ({ caller }) func updateSettings(settings : AppSettings) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("未授权：只有管理员可以更新应用设置");
    };
    appSettings := settings;
  };

  // ============================================
  // Random Unlock Tracking Functions
  // ============================================

  private func makeUnlockStateKey(viewer : Principal, workId : TextWorkId) : Text {
    viewer.toText() # ":" # workId;
  };

  private func calculateMaxCharacters(contentLength : Nat, fundingPercentage : Nat) : Nat {
    if (contentLength == 0) { return 0 };
    let maxCharacters = (contentLength * fundingPercentage) / 100;
    if (maxCharacters > contentLength) { contentLength } else { maxCharacters };
  };

  private func validateUnlockedText(unlockedText : Text, maxCharacters : Nat, contentLength : Nat) : Bool {
    let unlockedLength = unlockedText.size();
    unlockedLength <= maxCharacters and unlockedLength <= contentLength
  };

  public query ({ caller }) func getRandomUnlockState(workId : TextWorkId) : async ?RandomUnlockState {
    // Any caller (including guests) can query unlock state for works they can access
    switch (works.get(workId)) {
      case (null) { Runtime.trap("作品不存在") };
      case (?work) {
        validateWorkAccess(caller, work);
        let key = makeUnlockStateKey(caller, workId);
        randomUnlockStates.get(key);
      };
    };
  };

  public shared ({ caller }) func saveRandomUnlockState(
    workId : TextWorkId,
    unlockedText : Text,
    fundingPercentage : Nat
  ) : async () {
    // Any caller (including guests) can save unlock state for works they can access
    switch (works.get(workId)) {
      case (null) { Runtime.trap("作品不存在") };
      case (?work) {
        validateWorkAccess(caller, work);
        if (not work.randomUnlock) {
          Runtime.trap("该作品未启用随机解锁功能");
        };

        if (fundingPercentage > 100) {
          Runtime.trap("资金百分比无效");
        };

        let contentLength = work.content.size();
        let maxCharacters = calculateMaxCharacters(contentLength, fundingPercentage);

        if (not validateUnlockedText(unlockedText, maxCharacters, contentLength)) {
          Runtime.trap("解锁片段数量无效");
        };

        let key = makeUnlockStateKey(caller, workId);
        let state : RandomUnlockState = {
          viewerPrincipal = caller;
          workId;
          unlockedString = unlockedText;
          fundingPercentageWhenGenerated = fundingPercentage;
          lastUpdated = Time.now();
        };
        randomUnlockStates.add(key, state);
      };
    };
  };

  public shared ({ caller }) func updateRandomUnlockState(
    workId : TextWorkId,
    newUnlockedText : Text,
    currentFundingPercentage : Nat
  ) : async () {
    // Any caller (including guests) can update unlock state for works they can access
    switch (works.get(workId)) {
      case (null) { Runtime.trap("作品不存在") };
      case (?work) {
        validateWorkAccess(caller, work);
        if (not work.randomUnlock) {
          Runtime.trap("该作品未启用随机解锁功能");
        };

        if (currentFundingPercentage > 100) {
          Runtime.trap("资金百分比无效");
        };

        let contentLength = work.content.size();
        let maxCharacters = calculateMaxCharacters(contentLength, currentFundingPercentage);

        let key = makeUnlockStateKey(caller, workId);

        switch (randomUnlockStates.get(key)) {
          case (null) {
            if (not validateUnlockedText(newUnlockedText, maxCharacters, contentLength)) {
              Runtime.trap("解锁片段数量无效");
            };
            let state : RandomUnlockState = {
              viewerPrincipal = caller;
              workId;
              unlockedString = newUnlockedText;
              fundingPercentageWhenGenerated = currentFundingPercentage;
              lastUpdated = Time.now();
            };
            randomUnlockStates.add(key, state);
          };
          case (?existingState) {
            let mergedUnlockedString = existingState.unlockedString # newUnlockedText;

            if (not validateUnlockedText(mergedUnlockedString, maxCharacters, contentLength)) {
              Runtime.trap("合并后的解锁片段数量超过允许的最大值");
            };

            let updatedState : RandomUnlockState = {
              viewerPrincipal = caller;
              workId;
              unlockedString = mergedUnlockedString;
              fundingPercentageWhenGenerated = currentFundingPercentage;
              lastUpdated = Time.now();
            };
            randomUnlockStates.add(key, updatedState);
          };
        };
      };
    };
  };

  // ============================================
  // Work Query Functions (Public - accessible to all including guests)
  // ============================================

  func isValidWork(work : Work) : Bool {
    work.id.size() > 0
    and work.title.size() > 0
    and work.creator.toText().size() > 0
  };

  public query ({ caller }) func getWork(id : TextWorkId) : async ?Work {
    switch (works.get(id)) {
      case (null) { null };
      case (?work) {
        if (canAccessWork(caller, work)) {
          ?work
        } else {
          null
        }
      };
    };
  };

  private func getShortPreview(content : Text, length : Nat) : Text {
    if (content.size() <= length) {
      return content;
    };

    let chars : List.List<Char> = List.empty<Char>();

    // Convert Text to var Array to process chars (for Unicode).
    let contentArray = content.toArray();

    var count = 0;
    for (c in contentArray.values()) {
      if (count < (length : Nat)) {
        chars.add(c);
        count += 1;
      };
    };

    let reversedChars = chars.reverse();
    let iter = reversedChars.values();

    // Convert List to Iterator and then to Array
    let charArray = iter.toArray();

    // Convert Array<Char> to Text properly
    Text.fromArray(charArray);
  };

  public query ({ caller }) func getAllPaidWorks() : async [WorkSummary] {
    let allWorks = works.values().toArray();
    let filtered = allWorks.filter(
      func(work) {
        work.targetAmount > 0 and not work.deleted and isValidWork(work);
      }
    );

    filtered.map(func(work) {
      let preview = getShortPreview(work.content, 200);
      {
        id = work.id;
        title = work.title;
        author = work.author;
        publishedAt = work.publishedAt;
        targetAmount = work.targetAmount;
        workType = work.workType;
        timeWindow = work.timeWindow;
        randomUnlock = work.randomUnlock;
        contentPreview = preview;
      };
    });
  };

  public query ({ caller }) func getWorksByCreator(creator : Principal) : async [WorkSummary] {
    let allWorks = works.values().toArray();
    let filtered = allWorks.filter(
      func(work) {
        work.creator == creator and not work.deleted and isValidWork(work);
      }
    );

    filtered.map(func(work) {
      let preview = getShortPreview(work.content, 200);
      {
        id = work.id;
        title = work.title;
        author = work.author;
        publishedAt = work.publishedAt;
        targetAmount = work.targetAmount;
        workType = work.workType;
        timeWindow = work.timeWindow;
        randomUnlock = work.randomUnlock;
        contentPreview = preview;
      };
    });
  };

  public query ({ caller }) func getActiveWorksByOwner(owner : Principal) : async [WorkSummary] {
    if (caller != owner and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("未授权：只有作品创建者或管理员可以查看作品列表");
    };
    let allWorks = works.values().toArray();
    let filtered = allWorks.filter(
      func(work) {
        not work.deleted and work.creator == owner and isValidWork(work)
      }
    );

    filtered.map(func(work) {
      let preview = getShortPreview(work.content, 200);
      {
        id = work.id;
        title = work.title;
        author = work.author;
        publishedAt = work.publishedAt;
        targetAmount = work.targetAmount;
        workType = work.workType;
        timeWindow = work.timeWindow;
        randomUnlock = work.randomUnlock;
        contentPreview = preview;
      };
    });
  };

  public query ({ caller }) func getRemovedWorksByOwner(owner : Principal) : async [WorkSummary] {
    if (caller != owner and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("未授权：只有作品创建者或管理员可以查看已删除作品");
    };

    let allWorks = works.values().toArray();
    let filtered = allWorks.filter(
      func(work) {
        work.deleted and work.creator == owner and isValidWork(work)
      }
    );

    filtered.map(func(work) {
      let preview = getShortPreview(work.content, 200);
      {
        id = work.id;
        title = work.title;
        author = work.author;
        publishedAt = work.publishedAt;
        targetAmount = work.targetAmount;
        workType = work.workType;
        timeWindow = work.timeWindow;
        randomUnlock = work.randomUnlock;
        contentPreview = preview;
      };
    });
  };

  public query ({ caller }) func getWorksForCreator(creator : Principal) : async [WorkSummary] {
    if (caller != creator and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("未授权：只有作品创建者或管理员可以查看所有作品");
    };

    let allWorks = works.values().toArray();
    let filtered = allWorks.filter(
      func(work) {
        work.creator == creator and isValidWork(work)
      }
    );

    filtered.map(func(work) {
      let preview = getShortPreview(work.content, 200);
      {
        id = work.id;
        title = work.title;
        author = work.author;
        publishedAt = work.publishedAt;
        targetAmount = work.targetAmount;
        workType = work.workType;
        timeWindow = work.timeWindow;
        randomUnlock = work.randomUnlock;
        contentPreview = preview;
      };
    });
  };

  public query ({ caller }) func getActiveWork(id : TextWorkId) : async Work {
    switch (works.get(id)) {
      case (null) { Runtime.trap("作品不存在") };
      case (?work) {
        validateWorkAccess(caller, work);
        work;
      };
    };
  };

  public query ({ caller }) func getValidWorksByCreator(creator : Principal) : async [WorkSummary] {
    if (caller != creator and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("未授权：只有作品创建者或管理员可以查看所有作品");
    };

    let allWorks = works.values().toArray();
    let filtered = allWorks.filter(
      func(work) {
        work.creator == creator and isValidWork(work)
      }
    );

    filtered.map(func(work) {
      let preview = getShortPreview(work.content, 200);
      {
        id = work.id;
        title = work.title;
        author = work.author;
        publishedAt = work.publishedAt;
        targetAmount = work.targetAmount;
        workType = work.workType;
        timeWindow = work.timeWindow;
        randomUnlock = work.randomUnlock;
        contentPreview = preview;
      };
    });
  };

  public query ({ caller }) func getWorksWithRandomUnlock() : async [WorkSummary] {
    let allWorks = works.values().toArray();
    let filtered = allWorks.filter(
      func(work) {
        work.randomUnlock and not work.deleted and isValidWork(work)
      }
    );

    filtered.map(func(work) {
      let preview = getShortPreview(work.content, 200);
      {
        id = work.id;
        title = work.title;
        author = work.author;
        publishedAt = work.publishedAt;
        targetAmount = work.targetAmount;
        workType = work.workType;
        timeWindow = work.timeWindow;
        randomUnlock = work.randomUnlock;
        contentPreview = preview;
      };
    });
  };

  public query ({ caller }) func getRandomUnlockStatusLookup(id : TextWorkId) : async Bool {
    switch (works.get(id)) {
      case (?work) {
        validateWorkAccess(caller, work);
        work.randomUnlock;
      };
      case (null) { Runtime.trap("作品不存在") };
    };
  };

  public query ({ caller }) func getSettings() : async AppSettings {
    // Public query - anyone including guests can read app settings
    appSettings;
  };

  public query ({ caller }) func getAnalyticsSettings() : async {
    gaTrackingId : ?Text;
    analyticsEnabled : Bool;
  } {
    // Public query for GA settings
    {
      gaTrackingId = appSettings.gaTrackingId;
      analyticsEnabled = appSettings.analyticsEnabled;
    };
  };

  public shared ({ caller }) func updateAnalyticsSettings(settings : {
    gaTrackingId : ?Text;
    analyticsEnabled : Bool;
  }) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("未授权：只有管理员可以更新 GA 设置");
    };
    appSettings := {
      appSettings with
      gaTrackingId = settings.gaTrackingId;
      analyticsEnabled = settings.analyticsEnabled;
    };
  };

  // ============================================
  // Admin-Only Functions
  // ============================================

  public query ({ caller }) func getAllWorksAdmin() : async [Work] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("未授权：只有管理员可以访问所有作品");
    };
    works.values().toArray();
  };

  // ============================================
  // ICP Integration Functions
  // ============================================

  private func getNanoSeconds(timeWindow : TimeWindow) : Int {
    switch (timeWindow) {
      case (#last1Hour) { 3_600_000_000_000 };
      case (#last24Hours) { 86_400_000_000_000 };
      case (#last7Days) { 604_800_000_000_000 };
      case (#last30Days) { 2_592_000_000_000_000 };
      case (#permanent) { 0 };
    };
  };

  private func isTransactionInTimeWindow(txTimestamp : Int, workTimeWindow : TimeWindow) : Bool {
    switch (workTimeWindow) {
      case (#last1Hour) {
        Time.now() - txTimestamp <= 3_600_000_000_000;
      };
      case (#last24Hours) {
        Time.now() - txTimestamp <= 86_400_000_000_000;
      };
      case (#last7Days) {
        Time.now() - txTimestamp <= 604_800_000_000_000;
      };
      case (#last30Days) {
        Time.now() - txTimestamp <= 2_592_000_000_000_000;
      };
      case (#permanent) { true };
    };
  };

  private func getAccountBalanceProxy(accountId : Text, timeWindow : TimeWindow) : async Nat {
    let nanoSeconds = getNanoSeconds(timeWindow);
    let url = ICP_INDEX_URL # "/balance/" # accountId # "?timeWindow=" # nanoSeconds.toText();
    let response = await OutCall.httpGetRequest(url, [], transform);
    switch (Nat.fromText(response)) {
      case (?amount) { amount };
      case (null) { 0 };
    };
  };

  public shared ({ caller }) func getWorkDetailsWithTimeWindow(workId : TextWorkId) : async WorkDetail {
    switch (works.get(workId)) {
      case (null) { Runtime.trap("作品不存在") };
      case (?work) {
        validateWorkAccess(caller, work);

        let receivedAmount = await getAccountBalanceProxy(work.accountId, work.timeWindow);

        let progress = if (work.targetAmount == 0) {
          100;
        } else {
          (receivedAmount * 100) / work.targetAmount;
        };

        let isUnlocked = progress >= 100;

        {
          work;
          receivedAmount;
          unlockProgress = progress;
          unlocked = isUnlocked
        };
      };
    };
  };

  public query ({ caller }) func getWorkTimeWindow(workId : TextWorkId) : async TimeWindow {
    switch (works.get(workId)) {
      case (null) {
        Runtime.trap("作品不存在");
      };
      case (?work) {
        validateWorkAccess(caller, work);
        work.timeWindow;
      };
    };
  };

  // ============================================
  // Transform Function for HTTP Outcalls
  // ============================================

  public query ({ caller }) func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };
};
