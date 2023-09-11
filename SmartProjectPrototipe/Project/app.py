from flask import Flask, request, jsonify
import boto3


app = Flask(__name__)

try:
    dynamodb = boto3.resource('dynamodb', region_name='eu-north-1')
except Exception as e:
    print(f"Errore di connessione a DynamoDB: {e}")

@app.route('/<table_name>/<key>/<sort_key>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def handle_request(table_name, key, sort_key):
    try:
        table = dynamodb.Table(table_name)
        
        if request.method == 'GET':
            response = table.get_item(Key={'userID': key, 'lastName':sort_key})
            return jsonify(response.get('Item', {}))

        if request.method == 'POST':
            item = request.json
            table.put_item(Item=item)
            return jsonify({"status": "success"})

        if request.method == 'PUT':
            updated_values = request.json
            # Aggiungi qui la tua logica per l'aggiornamento

        if request.method == 'DELETE':
            table.delete_item(Key={'userID': key, 'lastName':sort_key})
            return jsonify({"status": "success"})

    except Exception as e:
        # Restituisci una risposta con il messaggio d'errore per aiutare la diagnosi
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Assicurati che il server sia in ascolto su tutte le interfacce
    app.run(host='0.0.0.0', port=5000)