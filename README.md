# 注意

- BoxUtils v0.5.0で実装されたコンテンツに応じたバッジ表示機能を使うには、Boxアプリケーションのスコープ設定で「Boxに格納されているすべてのファイルとフォルダへの **書き込み** 」を有効にする必要がある。そのため、 **_v0.4.0以前からバージョンアップした場合_** 、最初に1回だけ下記手順に従い、スコープの変更およびアクセストークンの再発行を行う必要がある。 ※新規インストールの場合は後述の「初期設定」の手順に従えばよいので本項は無視してよい。
  - Boxアプリケーションの設定変更
    1. [Boxの開発者コンソール](https://app.box.com/developers/console) にアクセスする。
    1. マイアプリの一覧からBoxUtils用に作成したアプリをクリックする。
    1. 当該アプリの画面の「構成」タブの「アプリケーションスコープ」欄の「コンテンツ操作」にある「Boxに格納されているすべてのファイルとフォルダへの **書き込み** 」にチェックを入れる。
    1. 「変更を保存」ボタンをクリックする。
  - BoxUtils拡張機能の設定変更
    1. アドレスバーの右の拡張機能のアイコン一覧からBoxUtilsのアイコン(青いフォルダマーク)を右クリックする。
    1. 右クリックして出てきた「オプション」をクリックし、BoxUtilsのオプション画面を表示する。
    1. BoxUtilsのオプション画面の「Debug」タブにある、「Clear Access Token」と「Clear Refresh Token」の2つのボタンを両方ともクリックする。

# BoxUtils

BoxUtils は [Box](https://www.box.com/) のためのユーティリティソフトウェアとなるChrome拡張機能である。
現在は主に下記の機能がある。

- BoxのWebサイト上で見ているファイルやフォルダについて、直接ローカルのWindows上のエクスプローラーでフォルダを開いたり、関連付けれらたアプリケーションでファイルを開く機能
  - [注意] この機能には別途 [Box Drive](https://www.box.com/ja-jp/drive) および [BoxUtilsHelper](https://github.com/sattoke/BoxUtilsHelper) のインストールが必要
  - [目的] フォルダツリーの探索などエクスプローラでの操作の方が慣れている人向け。
- クリップボードにコピーされているパス名から直接ローカルのWindows上のエクスプローラーでフォルダを開いたり、関連付けれらたアプリケーションでファイルを開く機能
  - [注意] この機能には別途 [Box Drive](https://www.box.com/ja-jp/drive) および [BoxUtilsHelper](https://github.com/sattoke/BoxUtilsHelper) のインストールが必要
  - [目的] この機能にはパスの変換機能が含まれており、主にUNCなどでアクセスする通常のファイルサーバをBoxに移行したとき、その移行先のパスに自動で変換することを目的にしている(例えば、 `\\some-server\foo\bar` を `%USERPROFILE%\Box\foo\bar` に変換したりなど)。
- BoxのWebサイト上で見ているファイルやフォルダについて、Box Driveで開くためのパスを取得や変換、クリップボードへコピーする機能
  - [目的] この機能にはパスの変換機能が含まれており、主にBoxの「共有」機能の特性より「共有した人」と「共有された人」でパスの見え方が異なることを吸収するためなどに用いる(例えば、URLだけではなくBox Driveでのパス名も他者に伝えたい場合に、 `%USERPROFILE%\Box\foo\some-share` を `%USERPROFILE%\Box\some-share` に変換したりなど)。その他、markdown形式のリンク作成などにも用いる(例えば `[<Box Driveのパス>](<BoxのWebサイト上でのURL>)` ようなリンクを作成するなど)。
- BoxのWebサイト上で見ているファイルやフォルダについて、更新日時を常に秒単位まで表示し、更新日時からの経過時間に応じて色付けをする機能
  - [目的] BoxのWeb上から見た場合、更新日時が「今日」などと丸められてしまうためそれを詳細表示したい場合に用いる。
- BoxのWebサイト上で見ているファイルについて、ファイルの中身の任意のバイト列に応じて任意のバッジをフォルダビュー上のファイルアイコンに重ねて表示する機能
  - [目的] 例えば意図せず暗号化されていたり、意図せず機密情報が含まれているときにそれを簡単に識別するためなどに用いる。
- BoxのWebサイトのバージョン履歴画面で、指定した二つのバージョン間のdiffをオプションで指定したローカルのdiffツールを用いて表示する機能
  - [目的] バージョン間の差分を見るのに用いる。

# 拡張機能のインストール方法

chrome ウェブストアからインストールする方法と、GitHubにあるコードからインストールする方法の2種類がある。
後者は開発者向けの方法のため、通常はchrome ウェブストアからインストールすること(インストールが簡単)。

## chrome ウェブストアからインストール (一般利用者向け：通常はこちらを利用すること)

[chrome ウェブストア](https://chrome.google.com/webstore/detail/boxutils/gagpkhipmdbjnflmcfjjchoielldogmm) にアクセスし、「Chromeに追加」ボタンをクリックする。

## GitHubにあるコードからインストール (開発者向け)

1. https://github.com/sattoke/BoxUtils をgitでcloneするか、当該URLの「Code」ボタンをクリックすると出てくる「Download ZIP」でダウンロードし、ZIPを適当なところに展開する。
1. Chromeのアドレスバーに `chrome://extensions/` と入力するか、Chromeのメニュー（ケバブメニュー）から、「設定」→「拡張機能」と選択することで拡張機能の管理画面を開く
1. 「パッケージ化されていない拡張機能を読み込む」ボタンをクリックし、出てくるダイアログでローカルにcloneまたはダウンロードして展開したBoxUtilsのフォルダ(manifest.jsonが含まれるフォルダ)を指定する。
1. 正常にインストールされれば拡張機能の管理画面に「BoxUtils」が表示される。後述のBoxの初期設定に必要なため、そこに表示されている拡張機能のID(英字32桁)をメモする。

# 初期設定

BoxUtilsは利用する前に下記に従いBox側とBoxUtils拡張機能側の両方の初期設定が必要である。

## 初期設定(Box)

1. [Boxの開発者コンソール](https://app.box.com/developers/console) にアクセスする。
1. 「マイアプリ」にある「アプリの新規作成」をクリック
1. [アプリの新規作成](https://app.box.com/developers/console/newapp) 画面では「カスタムアプリ」をクリック
1. ポップアップした「カスタムアプリ」の設定画面で「認証方法」として「ユーザー認証(OAuth 2.0)」の選択と、任意のアプリ名の入力を行い、「アプリの作成」ボタンをクリック
1. 作成したアプリの画面の「構成」タブで下記を行う。
   - 「OAuth 2.0資格情報」欄に表示されている「クライアントID」と「クライアントシークレット」をメモする。
   - 「OAuth 2.0リダイレクトURI欄の「リダイレクトURI」に `https://<拡張機能のID>.chromiumapp.org` と入力する。
     - `<拡張機能のID>` の部分は実際には拡張機能のIDで置き換えることとなるが、当該IDはインストール方法によって異なる。
       - chrome ウェブストアからインストールした場合の拡張機能のIDは `gagpkhipmdbjnflmcfjjchoielldogmm` となる。つまり「リダイレクトURI」には `https://gagpkhipmdbjnflmcfjjchoielldogmm.chromiumapp.org` と入力する。
       - GitHubにあるコードからインストールした場合の拡張機能のIDは、「拡張機能のインストール方法」の「GitHubにあるコードからインストール」の手順の最後にメモした英字32桁のIDである。
   - 「アプリケーションスコープ」欄は「コンテンツ操作」にある「Boxに格納されているすべてのファイルとフォルダへの **書き込み** 」にチェックを入れる。
1. 上記が終わったら「変更を保存」ボタンをクリックする。

## 初期設定(BoxUtils拡張機能)

1. Chromeのアドレスバーの右にある拡張機能のアイコン一覧の中にあるジグソーパズルのようなアイコンをクリックし、ポップアップした画面の中からBoxUtilsの右のピンマークをクリックしてアドレスバーの右の拡張機能のアイコン一覧にBoxUtilsのアイコン(青いフォルダマーク)が表示されるようにする
1. BoxUtilsのアイコンを右クリックして出てくる「オプション」をクリックし、BoxUtilsのオプション画面を表示する。
1. BoxUtilsのオプション画面の「OAuth 2.0 Client Information for box」欄にある「Client ID」と「Client Secret」に前述のBoxのアプリの構成でメモした「クライアントID」と「クライアントシークレット」を記入して、オプション画面下の方にある「Save」ボタンをクリックする。

# 使用方法

- BoxのWebサイト上で見ているファイルやフォルダについて、直接ローカルのWindows上のエクスプローラーでフォルダを開いたり、関連付けれらたアプリケーションでファイルを開く機能
  - [注意] この機能には別途 [Box Drive](https://www.box.com/ja-jp/drive) および [BoxUtilsHelper](https://github.com/sattoke/BoxUtilsHelper) のインストールが必要
  - [目的] フォルダツリーの探索などエクスプローラでの操作の方が慣れている人向け。
  - [Box](https://www.box.com/) へアクセスし通常通りファイルやフォルダのページを表示した状態で、Chromeのアドレスバーの右の拡張機能のアイコン一覧にあるBoxUtilsのアイコン(青いフォルダマーク)をクリックして開くポップアップメニューで、一番上の左にあるフォルダのアイコンをクリックするとエクスプローラー (explorer.exe) で当該フォルダを開く(ファイルのページを表示している場合は当該ファイルを格納しているフォルダを開く）。
  - 同様にポップアップメニューの一番上の右にあるファイルのアイコンをクリックするとローカルのWindows上の当該ファイルに関連付けられたアプリケーションでファイルを開く（フォルダのページを開いている場合は当該フォルダをエクスプーラで開く）。
- クリップボードにコピーされているパス名から直接ローカルのWindows上のエクスプローラーでフォルダを開いたり、関連付けれらたアプリケーションでファイルを開く機能
  - [注意] この機能には別途 [Box Drive](https://www.box.com/ja-jp/drive) および [BoxUtilsHelper](https://github.com/sattoke/BoxUtilsHelper) のインストールが必要
  - [目的] この機能にはパスの変換機能が含まれており、主にUNCなどでアクセスする通常のファイルサーバをBoxに移行したとき、その移行先のパスに自動で変換することを目的にしている(例えば、 `\\some-server\foo\bar` を `%USERPROFILE%\Box\foo\bar` に変換したりなど)。
  - 使用方法は上述のBoxのWebサイト上で見ているファイルやフォルダを開く機能とほぼ同等である。フォルダとファイルのアイコンの意味も同様である。ただし、成就の機能が現在開いているBoxのWebサイトに対応するファイルやフォルダを開くのに対し、当機能はクリップボードにコピーされているパスに対して動作することが異なる。
  - オプション画面の [Path Conversion] タブの箇所で[目的]に記載した内容の設定を行うことができる。
- BoxのWebサイト上で見ているファイルやフォルダについて、Box Driveで開くためのパスを取得や変換、クリップボードへコピーする機能
  - [目的] この機能にはパスの変換機能が含まれており、主にBoxの「共有」機能の特性より「共有した人」と「共有された人」でパスの見え方が異なることを吸収するためなどに用いる(例えば、URLだけではなくBox Driveでのパス名も他者に伝えたい場合に、 `%USERPROFILE%\Box\foo\some-share` を `%USERPROFILE%\Box\some-share` に変換したりなど)。その他、markdown形式のリンク作成などにも用いる(例えば `[<Box Driveのパス>](<BoxのWebサイト上でのURL>)` ようなリンクを作成するなど)。
  - [Box](https://www.box.com/) へアクセスし通常通りファイルやフォルダのページを表示した状態で、Chromeのアドレスバーの右の拡張機能のアイコン一覧にあるBoxUtilsのアイコン(青いフォルダマーク)をクリックして開くポップアップメニューで、5つ並んだボタンから所望のコピー方式をクリックするとクリップボードにパス等がコピーされる。
  - 5つのボタンで各々何がコピーされるかはBoxUtilsのオプション画面でカスタマイズが可能である。詳細はオプション画面を参照。
- BoxのWebサイト上で見ているファイルやフォルダについて、更新日時を常に秒単位まで表示し、更新日時からの経過時間に応じて色付けをする機能
  - [目的] BoxのWeb上から見た場合、更新日時が「今日」などと丸められてしまうためそれを詳細表示したい場合に用いる。
  - 特に操作は不要でデフォルトで詳細表示が有効になっている。オプション画面の設定で詳細表示の有効/無効を切り替えできる。
- BoxのWebサイト上で見ているファイルについて、ファイルの中身の任意のバイト列に応じて任意のバッジをフォルダビュー上のファイルアイコンに重ねて表示する機能
  - [目的] 例えば意図せず暗号化されていたり、意図せず機密情報が含まれているときにそれを簡単に識別するためなどに用いる。
  - 特に操作は不要で、オプション画面の [Badge] タブで、ファイル中の検索開始バイト位置、検索終了バイト位置、検索文字列(バイト列)、バッジに表示するテキスト・文字色・背景色を設定すると、検索条件にファイル内のバイト列がマッチしたときに指定したバッジがフォルダビュー上のファイルのアイコンに重ねて表示される。
- BoxのWebサイトのバージョン履歴画面で、指定した二つのバージョン間のdiffをオプションで指定したローカルのdiffツールを用いて表示する機能
  - [目的] バージョン間の差分を見るのに用いる。
  - BoxのWebサイトのバージョン履歴画面で、表示されているバージョン番号のバッジ(V1やV2などと表示されている)をクリックすると選択した順に[1]、[2]と番号が表示されるようになる。2つ目を選択したときに「Show diff」というボタンが表示されるためそれをクリックするとオプション画面で設定したローカルのdiffツールが起動されdiffを見ることができる。オプション画面でのdiffツールの設定は例えば `"C:\Program Files\WinMerge\WinMergeU.exe" /e /maximize` などと設定する。

初回実行時やトークンの有効期限が切れた場合などは、Boxの認証画面と認可画面が表示されることがあるので適宜BoxのIDパスワードの入力を行うこと。一度認可した後は、本拡張機能を最後に利用してから最大60日間(リフレッシュトークンの有効期限)はユーザによる認証や認可の操作は不要となる (cf. [トークン - Box開発者向けドキュメントポータル](https://ja.developer.box.com/guides/authentication/tokens/) )。

# リソース

- アイコンは下記の [icon rainbow](https://icon-rainbow.com/) や [Google Fonts](https://fonts.google.com/) の素材を使用。
  - [シンプルなフォルダのアイコン素材 4](https://icon-rainbow.com/%e3%82%b7%e3%83%b3%e3%83%97%e3%83%ab%e3%81%aa%e3%83%95%e3%82%a9%e3%83%ab%e3%83%80%e3%81%ae%e3%82%a2%e3%82%a4%e3%82%b3%e3%83%b3%e7%b4%a0%e6%9d%90-4/)
  - [Folder Open](https://fonts.google.com/icons?icon.query=folder+open&icon.style=Rounded)
  - [File Open](https://fonts.google.com/icons?icon.query=file+open&icon.style=Rounded)
  - [Content Copy](https://fonts.google.com/icons?icon.query=content+copy&icon.style=Rounded)
