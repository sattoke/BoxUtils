# BoxUtils
BoxUtils は [Box](https://www.box.com/) のためのユーティリティソフトウェアとなるChrome拡張機能である。
現在は主に下記の機能がある。

- Webブラウザ上で見ているファイルやフォルダについて、Box Driveで開くためのパスを取得や変換、クリップボードへコピーする機能
- Webブラウザ上で見ているファイルやフォルダについて、ローカルのWindows上で直接開く機能 (別途 [BoxUtilsHelper](https://github.com/sattoke/BoxUtilsHelper) のインストールが必要)
- Webブラウザ上で見ているファイルやフォルダについて、更新日時を常に秒単位まで表示し、更新日時からの経過時間に応じて色付けをする機能

# 拡張機能のインストール方法
現在はChromeウェブストアに登録していないため、下記手順でソースコードをダウンロードしてローカルからインストールする必要がある。

1. https://github.com/sattoke/BoxUtils をgitでcloneするか、当該URLの「Code」ボタンをクリックすると出てくる「Download ZIP」でダウンロードし、ZIPを適当なところに展開する。
1. Chromeのアドレスバーに `chrome://extensions/` と入力するか、Chromeのメニュー（ケバブメニュー）から、「設定」→「拡張機能」と選択することで拡張機能の管理画面を開く
1. 「パッケージ化されていない拡張機能を読み込む」ボタンをクリックし、出てくるダイアログでローカルにcloneまたはダウンロードして展開したBoxUtilsのフォルダ(manifest.jsonが含まれるフォルダ)を指定する。
1. 正常にインストールされれば拡張機能の管理画面に「BoxUtils」が表示される。Boxの設定に必要なため、そこに表示されている拡張機能のID(英字32桁)をメモする。

# 初期設定(Box)

1. [Boxの開発者コンソール](https://app.box.com/developers/console) にアクセスする。
1. 「マイアプリ」にある「アプリの新規作成」をクリック
1. [アプリの新規作成](https://app.box.com/developers/console/newapp) 画面では「カスタムアプリ」をクリック
1. ポップアップした「カスタムアプリ」の設定画面で「認証方法」として「ユーザー認証(OAuth 2.0)」の選択と、任意のアプリ名の入力を行い、「アプリの作成」ボタンをクリック
1. 作成したアプリの画面の「構成」タブで下記を行う。
   - 「OAuth 2.0資格情報」欄に表示されている「クライアントID」と「クライアントシークレット」をメモする。
   - 「OAuth 2.0リダイレクトURI欄の「リダイレクトURI」に `https://<拡張機能のID>.chromiumapp.org` と入力する。 `<拡張機能のID>` は「拡張機能のインストール方法」の最後にメモした英字32桁のIDである。
   - 「アプリケーションスコープ」欄は「コンテンツ操作」にある「Boxに格納されているすべてのファイルとフォルダの読み取り」のみにチェックを入れる(デフォルト)。
1. 上記が終わったら「変更を保存」ボタンをクリックする。

# 初期設定(BoxUtil拡張機能)

1. Chromeのアドレスバーの右にある拡張機能のアイコン一覧の中にあるジグソーパズルのようなアイコンをクリックし、ポップアップした画面の中からBoxUtilsの右のピンマークをクリックしてアドレスバーの右の拡張機能のアイコン一覧にBoxUtilsのアイコン(青いフォルダマーク)が表示されるようにする
1. BoxUtilsのアイコンを右クリックし「オプション」をクリックし、BoxUtilsのオプション画面を表示する。
1. BoxUtilsのオプション画面の「OAuth 2.0 Client Information for box」欄にある「Client ID」と「Client Secret」に前述のBoxのアプリの構成でメモした「クライアントID」と「クライアントシークレット」を記入して、オプション画面下の方にある「Save」ボタンをクリックする。

# 使用方法

[Box](https://www.box.com/) へアクセスし通常通りファイルやフォルダを表示し、Box Drive用のパスなどをコピーしたいときは、Chromeのアドレスバーの右の拡張機能のアイコン一覧にあるBoxUtilsのアイコン(青いフォルダマーク)をクリックして開くポップアップメニューで、5つ並んだボタンから所望のコピー方式をクリックするとクリップボードにパス等がコピーされる。
同ポップアップメニューからフォルダやファイルのアイコンをクリックすると、直接ローカルのOS上のエクスプローラーでフォルダを開いたり、関連付けれらたアプリケーションでファイルを開く。

初回実行時やトークンの有効期限が切れた場合などは、Boxの認証画面と認可画面が表示されることがあるので適宜IDパスワードの入力を行うこと。一度認可した後は最大60日間(リフレッシュトークンの有効期限)、認証や認可は不要となる (cf. [トークン - Box開発者向けドキュメントポータル](https://ja.developer.box.com/guides/authentication/tokens/) )。

5つのボタンで各々何がコピーされるかはBoxUtilのオプション画面でカスタマイズが可能である。詳細はオプション画面を参照。

# リソース
- アイコンは下記の [icon rainbow](https://icon-rainbow.com/) や [Google Fonts](https://fonts.google.com/) の素材を使用させてもらった。
  - [シンプルなフォルダのアイコン素材 4](https://icon-rainbow.com/%e3%82%b7%e3%83%b3%e3%83%97%e3%83%ab%e3%81%aa%e3%83%95%e3%82%a9%e3%83%ab%e3%83%80%e3%81%ae%e3%82%a2%e3%82%a4%e3%82%b3%e3%83%b3%e7%b4%a0%e6%9d%90-4/)
  - [Folder Open](https://fonts.google.com/icons?icon.query=folder+open&icon.style=Rounded)
  - [File Open](https://fonts.google.com/icons?icon.query=file+open&icon.style=Rounded)
  - [Content Copy](https://fonts.google.com/icons?icon.query=content+copy&icon.style=Rounded)
